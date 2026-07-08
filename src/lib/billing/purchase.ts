// Installment purchase (docs/REQUIREMENTS §5.3, §3.7, §15.2). Recognizes the
// FULL liability up front as a single balanced entry, then records the plan and
// its per-cycle schedule. The schedule only shapes how the debt is billed — it
// never re-journals the purchase.
import { cycleForDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { prisma } from "@/lib/db";
import { generateInstallmentSchedule } from "./installments";
import { dueConfigFor, loadCreditAccount } from "./shared";

export interface InstallmentPurchaseInput {
  creditAccountId: string;
  /// The EXPENSE account the purchase is booked to.
  expenseAccountId: string;
  categoryId?: string | null;
  principal: bigint;
  tenorMonths: number;
  /// Flat monthly rate for the plan; defaults to "0" (0% installment).
  interestRateMonthly?: string;
  date: Date;
  postedDate?: Date | null;
  description: string;
  merchant?: string | null;
}

/// Create an installment purchase (§5.3). The first installment bills in the
/// cycle the purchase falls into (§15.2, §5.5), derived from the posted date and
/// the card's statement day.
export async function createInstallmentPurchase(userId: string, input: InstallmentPurchaseInput) {
  if (input.principal <= 0n) throw new Error("principal must be positive");

  return prisma.$transaction(async (tx) => {
    const ca = await loadCreditAccount(tx, userId, input.creditAccountId);
    const expense = await tx.account.findFirst({
      where: { id: input.expenseAccountId, userId, type: "EXPENSE" },
      select: { id: true },
    });
    if (!expense) throw new Error("expense account not found for this user (§6.0)");

    const rate = input.interestRateMonthly ?? "0";
    const effPosted = input.postedDate ?? input.date;
    const cycle = cycleForDate(effPosted, ca.statementDay);
    const startYear = cycle.periodEnd.getUTCFullYear();
    const startMonth = cycle.periodEnd.getUTCMonth() + 1;

    const generated = generateInstallmentSchedule({
      principal: money(input.principal),
      tenorMonths: input.tenorMonths,
      interestRateMonthly: rate,
      startYear,
      startMonth,
      statementDay: ca.statementDay,
      due: dueConfigFor(ca),
    });

    // Full liability recognized now: Dr Expense / Cr Liability (§5.3).
    const purchase = await tx.transaction.create({
      data: {
        userId,
        date: input.date,
        postedDate: input.postedDate ?? null,
        description: input.description,
        merchant: input.merchant ?? null,
        type: "INSTALLMENT_PURCHASE",
        postings: {
          create: [
            { accountId: input.expenseAccountId, amount: input.principal, categoryId: input.categoryId ?? null },
            { accountId: ca.accountId, amount: -input.principal },
          ],
        },
      },
    });

    const plan = await tx.installmentPlan.create({
      data: {
        creditAccountId: ca.id,
        purchaseTransactionId: purchase.id,
        principal: input.principal,
        tenorMonths: input.tenorMonths,
        interestRateMonthly: rate,
        monthlyAmount: generated.monthlyAmount,
        startDate: cycle.periodEnd,
        status: "ACTIVE",
      },
    });

    await tx.installmentSchedule.createMany({
      data: generated.schedule.map((row) => ({
        planId: plan.id,
        sequence: row.sequence,
        dueDate: row.dueDate,
        principalComponent: row.principalComponent,
        interestComponent: row.interestComponent,
        totalAmount: row.totalAmount,
        status: "SCHEDULED",
      })),
    });

    return { transaction: purchase, plan };
  });
}
