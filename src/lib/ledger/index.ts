// Ledger DB operations (docs/REQUIREMENTS §2, §6.2, §13.2). Every write is a
// balanced double-entry (Σ=0, checked here AND by the DB trigger) and is scoped
// to the acting user — a posting's account, and any category, must belong to
// that user (tenant isolation, §6.0/§13.2). Corrections are reversing entries,
// never destructive edits (P3, append-only).
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jakartaCivilDate } from "@/lib/dates";
import { assertBalanced } from "./invariant";

export interface PostingInput {
  accountId: string;
  /// Signed whole rupiah: debit = +, credit = − (§2.1).
  amount: bigint;
  categoryId?: string | null;
}

export interface TransactionInput {
  /// The acting user; also the audit actor (§7). All postings must belong here.
  userId: string;
  date: Date;
  postedDate?: Date | null;
  description: string;
  merchant?: string | null;
  type: TransactionType;
  note?: string | null;
  reversalOfId?: string | null;
  installmentPlanId?: string | null;
  statementId?: string | null;
  postings: PostingInput[];
}

/// Persist a balanced transaction with its postings in one DB transaction. The
/// deferred Σ=0 trigger fires at COMMIT, so an unbalanced write can never land.
export async function postTransaction(input: TransactionInput) {
  assertBalanced(input.postings);

  const accountIds = [...new Set(input.postings.map((p) => p.accountId))];
  const categoryIds = [
    ...new Set(
      input.postings
        .map((p) => p.categoryId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  return prisma.$transaction(async (tx) => {
    // Tenant isolation (§13.2): confirm every referenced account/category is the
    // acting user's before writing any leg.
    const accounts = await tx.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, userId: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new Error("one or more posting accounts do not exist");
    }
    for (const a of accounts) {
      if (a.userId !== input.userId) {
        throw new Error(`account ${a.id} does not belong to the acting user (§6.0)`);
      }
    }

    if (categoryIds.length > 0) {
      const categories = await tx.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, userId: true },
      });
      if (categories.length !== categoryIds.length) {
        throw new Error("one or more posting categories do not exist");
      }
      for (const c of categories) {
        if (c.userId !== input.userId) {
          throw new Error(`category ${c.id} does not belong to the acting user (§6.0)`);
        }
      }
    }

    return tx.transaction.create({
      data: {
        userId: input.userId,
        date: input.date,
        postedDate: input.postedDate ?? null,
        description: input.description,
        merchant: input.merchant ?? null,
        type: input.type,
        note: input.note ?? null,
        reversalOfId: input.reversalOfId ?? null,
        installmentPlanId: input.installmentPlanId ?? null,
        statementId: input.statementId ?? null,
        postings: {
          create: input.postings.map((p) => ({
            accountId: p.accountId,
            amount: p.amount,
            categoryId: p.categoryId ?? null,
          })),
        },
      },
      include: { postings: true },
    });
  });
}

/// Reverse a transaction by appending a compensating entry with negated legs
/// (P3, §2.2, §6.2). Never mutates or deletes the original. Refuses to reverse
/// twice, or to touch another user's data.
export async function reverseTransaction(
  userId: string,
  transactionId: string,
  opts?: { date?: Date; description?: string },
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { postings: true },
    });
    if (!original) {
      throw new Error("transaction not found for this user (§6.0)");
    }
    const existing = await tx.transaction.findFirst({
      where: { reversalOfId: transactionId },
      select: { id: true },
    });
    if (existing) {
      throw new Error(`transaction ${transactionId} is already reversed by ${existing.id}`);
    }

    return tx.transaction.create({
      data: {
        userId,
        date: opts?.date ?? jakartaCivilDate(new Date()),
        description: opts?.description ?? `Reversal of: ${original.description}`,
        type: original.type,
        reversalOfId: original.id,
        postings: {
          create: original.postings.map((p) => ({
            accountId: p.accountId,
            amount: -p.amount,
            categoryId: p.categoryId,
          })),
        },
      },
      include: { postings: true },
    });
  });
}

/// Natural-sign balance of one account as of a date (P6, §2.3): openingBalance +
/// Σ postings whose transaction date ≤ asOf. Scoped to the owning user.
export async function getAccountBalance(
  userId: string,
  accountId: string,
  asOf?: Date,
): Promise<bigint> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { openingBalance: true },
  });
  if (!account) {
    throw new Error("account not found for this user (§6.0)");
  }
  const agg = await prisma.posting.aggregate({
    _sum: { amount: true },
    where: {
      accountId,
      transaction: { userId, ...(asOf ? { date: { lte: asOf } } : {}) },
    },
  });
  return account.openingBalance + (agg._sum.amount ?? 0n);
}

/// Net worth for a user as of a date (§2.3): Σ ASSET − Σ LIABILITY, derived
/// straight from postings. Archived accounts still count toward history (§6.1a).
export async function getNetWorth(userId: string, asOf?: Date): Promise<bigint> {
  const accounts = await prisma.account.findMany({
    where: { userId, type: { in: ["ASSET", "LIABILITY"] } },
    select: { id: true, type: true, openingBalance: true },
  });
  if (accounts.length === 0) return 0n;

  const grouped = await prisma.posting.groupBy({
    by: ["accountId"],
    _sum: { amount: true },
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      transaction: { userId, ...(asOf ? { date: { lte: asOf } } : {}) },
    },
  });
  const movement = new Map(grouped.map((g) => [g.accountId, g._sum.amount ?? 0n]));

  let assets = 0n;
  let liabilities = 0n;
  for (const a of accounts) {
    const natural = a.openingBalance + (movement.get(a.id) ?? 0n);
    if (a.type === "ASSET") assets += natural;
    else liabilities += -natural;
  }
  return assets - liabilities;
}

export * from "./invariant";
export * from "./balance";
