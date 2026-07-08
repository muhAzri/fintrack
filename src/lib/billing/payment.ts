// Bill payments (docs/REQUIREMENTS §5.4, §15.3). A payment is a CC_PAYMENT
// transfer from an ASSET (cash/bank) to the LIABILITY (the card) — never an
// expense. It reduces the target statement's outstanding amount and recomputes
// its status. MVP allocation is the simplified form of §5.4 (reduce paidAmount,
// then recompute status); pay-in-full / partial / minimum are all just amounts.
import { prisma } from "@/lib/db";
import { loadCreditAccount } from "./shared";

export interface CardPaymentInput {
  creditAccountId: string;
  /// Source ASSET account (cash/bank) the money leaves from.
  sourceAccountId: string;
  amount: bigint;
  date: Date;
  /// Statement to allocate against; defaults to the oldest not-yet-paid one.
  statementId?: string;
  description?: string;
}

/// Record a card/paylater bill payment (§5.4). Overpayment is allowed — the
/// liability simply goes positive (a credit on the card, §5.5).
export async function recordCardPayment(userId: string, input: CardPaymentInput) {
  if (input.amount <= 0n) throw new Error("payment amount must be positive");

  return prisma.$transaction(async (tx) => {
    const ca = await loadCreditAccount(tx, userId, input.creditAccountId);
    const source = await tx.account.findFirst({
      where: { id: input.sourceAccountId, userId },
      select: { id: true },
    });
    if (!source) throw new Error("source account not found for this user (§6.0)");

    const target = input.statementId
      ? await tx.statement.findFirst({ where: { id: input.statementId, creditAccountId: ca.id } })
      : await tx.statement.findFirst({
          where: { creditAccountId: ca.id, status: { in: ["CLOSED", "PARTIALLY_PAID", "OVERDUE"] } },
          orderBy: { periodEnd: "asc" },
        });

    // Dr Liability / Cr Asset (§5.4) — a transfer, not an expense.
    const payment = await tx.transaction.create({
      data: {
        userId,
        date: input.date,
        description: input.description ?? "Card payment",
        type: "CC_PAYMENT",
        statementId: target?.id ?? null,
        postings: {
          create: [
            { accountId: ca.accountId, amount: input.amount },
            { accountId: input.sourceAccountId, amount: -input.amount },
          ],
        },
      },
    });

    let statement = target;
    if (statement) {
      const paidAmount = statement.paidAmount + input.amount;
      const status = paidAmount >= statement.statementBalance ? "PAID" : "PARTIALLY_PAID";
      statement = await tx.statement.update({
        where: { id: statement.id },
        data: { paidAmount, status },
      });
    }

    return { transaction: payment, statement };
  });
}
