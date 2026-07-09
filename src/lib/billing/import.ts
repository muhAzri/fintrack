// Import an EXISTING installment plan that was already running before the books
// opened (docs/REQUIREMENTS §4, §5.3, §13.4). Unlike a fresh purchase
// (./purchase.ts), the spend already happened, so we must NOT re-recognize an
// expense. Instead the still-owed balance is booked against "Opening Balance"
// equity — Dr Equity / Cr Liability — and only the REMAINING installments are
// scheduled. The interest can be given either as a flat monthly rate or, more
// naturally for Indonesian "cicilan tetap", as the fixed rupiah installment
// (from which the flat interest is recovered — §13.4).
import { cycleForDate } from "@/lib/dates";
import { applyRate, money } from "@/lib/money";
import { prisma } from "@/lib/db";
import { buildInstallmentSchedule, interestFromMonthly } from "./installments";
import { dueConfigFor, findOpeningBalanceEquityAccount, loadCreditAccount } from "./shared";

export interface ImportExistingInstallmentInput {
  creditAccountId: string;
  /// The principal STILL owed (not the original). Recognized now against Opening
  /// Balance equity — never as a fresh expense.
  remainingPrincipal: bigint;
  /// The number of monthly installments STILL to pay.
  remainingTenor: number;
  /// Exactly ONE of these describes the interest (§13.4):
  ///  - monthlyAmount: the fixed rupiah installment you pay; flat interest is
  ///    recovered as monthly − remainingPrincipal/remainingTenor.
  ///  - interestRateMonthly: a flat monthly rate applied to the remaining
  ///    principal (treats the remaining balance as a fresh flat plan). "0" = 0%.
  monthlyAmount?: bigint | null;
  interestRateMonthly?: string | null;
  /// "As of" date the debt is recognized; also the anchor whose billing cycle
  /// carries the first remaining installment (§15.2). Defaults to now.
  date?: Date | null;
  description: string;
  /// Test/override hook — otherwise the seeded "Opening Balance" account is used.
  openingEquityAccountId?: string;
}

/// Convert an integer interest-per-month into a Decimal(9,6) rate string, purely
/// for the plan's `interestRateMonthly` record. The schedule rows are the source
/// of truth for billing (§3.7), so this is cosmetic and may round at 6 dp.
function rateDecimalString(interestPerMonth: bigint, principal: bigint): string {
  if (principal <= 0n) return "0.000000";
  const scaled = (interestPerMonth * 1_000_000n + principal / 2n) / principal; // half-up
  const s = scaled.toString().padStart(7, "0");
  return `${s.slice(0, -6)}.${s.slice(-6)}`;
}

/// Import an existing, in-progress installment plan (§5.3, §13.4). Recognizes
/// only the remaining balance (Dr Opening Balance equity / Cr liability) and
/// schedules only the remaining installments. Returns the opening transaction
/// and the created plan.
export async function importExistingInstallmentPlan(
  userId: string,
  input: ImportExistingInstallmentInput,
) {
  if (input.remainingPrincipal <= 0n) throw new Error("remainingPrincipal must be positive");

  const hasMonthly = input.monthlyAmount != null;
  const hasRate = input.interestRateMonthly != null && input.interestRateMonthly !== "";
  if (hasMonthly === hasRate) {
    throw new Error("provide exactly one of monthlyAmount or interestRateMonthly");
  }

  return prisma.$transaction(async (tx) => {
    const ca = await loadCreditAccount(tx, userId, input.creditAccountId);
    const equityAccountId = await findOpeningBalanceEquityAccount(
      tx,
      userId,
      input.openingEquityAccountId,
    );

    const principal = money(input.remainingPrincipal);
    const interestPerMonth = hasMonthly
      ? interestFromMonthly(principal, money(input.monthlyAmount!), input.remainingTenor)
      : applyRate(principal, input.interestRateMonthly!);

    const asOf = input.date ?? new Date();
    const cycle = cycleForDate(asOf, ca.statementDay);
    const startYear = cycle.periodEnd.getUTCFullYear();
    const startMonth = cycle.periodEnd.getUTCMonth() + 1;

    const generated = buildInstallmentSchedule({
      principal,
      tenorMonths: input.remainingTenor,
      interestPerMonth,
      startYear,
      startMonth,
      statementDay: ca.statementDay,
      due: dueConfigFor(ca),
    });

    // Recognize the pre-existing debt against equity (§4): Dr Opening Balance /
    // Cr Liability. This never touches an expense account — the spend predates
    // the ledger. Σ = 0 is enforced by the deferred DB trigger.
    const opening = await tx.transaction.create({
      data: {
        userId,
        date: asOf,
        description: input.description,
        type: "ADJUSTMENT",
        postings: {
          create: [
            { accountId: equityAccountId, amount: input.remainingPrincipal },
            { accountId: ca.accountId, amount: -input.remainingPrincipal },
          ],
        },
      },
    });

    const plan = await tx.installmentPlan.create({
      data: {
        creditAccountId: ca.id,
        purchaseTransactionId: opening.id,
        principal: input.remainingPrincipal,
        tenorMonths: input.remainingTenor,
        interestRateMonthly: hasRate
          ? input.interestRateMonthly!
          : rateDecimalString(interestPerMonth, input.remainingPrincipal),
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
        status: "SCHEDULED" as const,
      })),
    });

    return { transaction: opening, plan };
  });
}
