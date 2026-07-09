// Shared helpers for the billing DB layer (docs/REQUIREMENTS §5).
import { Prisma } from "@prisma/client";
import type { DueConfig } from "@/lib/dates";

/// Load a credit account owned by the user (tenant isolation, §6.0/§13.2),
/// including its parent LIABILITY account.
export async function loadCreditAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  creditAccountId: string,
) {
  const ca = await tx.creditAccount.findFirst({
    where: { id: creditAccountId, account: { userId } },
    include: { account: true },
  });
  if (!ca) throw new Error("credit account not found for this user (§6.0)");
  return ca;
}

/// Build a DueConfig from a credit account's parameters (§3.5, exactly one set).
export function dueConfigFor(ca: { dueDay: number | null; dueOffsetDays: number | null }): DueConfig {
  if (ca.dueDay != null) return { dueDay: ca.dueDay };
  if (ca.dueOffsetDays != null) return { dueOffsetDays: ca.dueOffsetDays };
  throw new Error("credit account has neither dueDay nor dueOffsetDays (§3.5)");
}

/// Inclusive civil-date containment: periodStart ≤ date ≤ periodEnd.
export function inCycle(date: Date, cycle: { periodStart: Date; periodEnd: Date }): boolean {
  const t = date.getTime();
  return t >= cycle.periodStart.getTime() && t <= cycle.periodEnd.getTime();
}

export function bigMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/// Find the user's "Card Interest & Fees" expense account (seeded by §4), or use
/// an explicit override. Interest legs post against it (§5.3, §5.4).
export async function findInterestExpenseAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  override?: string,
): Promise<string> {
  if (override) return override;
  const acc = await tx.account.findFirst({
    where: { userId, type: "EXPENSE", name: "Card Interest & Fees" },
    select: { id: true },
  });
  if (!acc) {
    throw new Error(
      "no 'Card Interest & Fees' expense account found — seed the chart of accounts or pass interestExpenseAccountId",
    );
  }
  return acc.id;
}

/// Find the user's "Opening Balance" equity account (seeded by §4), or use an
/// explicit override. Pre-existing debt imported into the ledger posts its
/// offsetting leg here — NOT to an expense — because the spend predates the
/// books (§4 opening balances).
export async function findOpeningBalanceEquityAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  override?: string,
): Promise<string> {
  if (override) return override;
  const acc = await tx.account.findFirst({
    where: { userId, type: "EQUITY", name: "Opening Balance" },
    select: { id: true },
  });
  if (!acc) {
    throw new Error(
      "no 'Opening Balance' equity account found — seed the chart of accounts or pass openingEquityAccountId",
    );
  }
  return acc.id;
}
