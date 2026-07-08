// "Where is my money" aggregate + per-account history (docs/REQUIREMENTS §6.1a,
// §5.6). Balances are always derived from openingBalance + Σ postings (P6).
import type { AccountSubtype } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isLiquidSubtype } from "./subtype";

export interface MoneyStorageRow {
  id: string;
  name: string;
  subtype: AccountSubtype | null;
  icon: string | null;
  color: string | null;
  group: string | null;
  balance: bigint;
}

export interface MoneyStorageView {
  accounts: MoneyStorageRow[];
  /// Per-subtype subtotals (total cash, total in banks, total in e-wallets, …).
  subtotalsBySubtype: Partial<Record<AccountSubtype, bigint>>;
  /// CASH + BANK + EWALLET — feeds the due-date cash-coverage indicator (§5.6).
  totalLiquid: bigint;
}

/// Aggregate every active asset account with its derived balance, per-subtype
/// subtotals, and Total Liquid (§6.1a, §15.4). Archived accounts are excluded
/// from this active view but still count toward history/net worth elsewhere.
export async function moneyStorageView(userId: string, asOf?: Date): Promise<MoneyStorageView> {
  const accounts = await prisma.account.findMany({
    where: { userId, type: "ASSET", isArchived: false },
    select: { id: true, name: true, subtype: true, icon: true, color: true, group: true, openingBalance: true },
    orderBy: [{ subtype: "asc" }, { name: "asc" }],
  });

  const movement = new Map<string, bigint>();
  if (accounts.length > 0) {
    const grouped = await prisma.posting.groupBy({
      by: ["accountId"],
      _sum: { amount: true },
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        transaction: { userId, ...(asOf ? { date: { lte: asOf } } : {}) },
      },
    });
    for (const g of grouped) movement.set(g.accountId, g._sum.amount ?? 0n);
  }

  const rows: MoneyStorageRow[] = [];
  const subtotalsBySubtype: Partial<Record<AccountSubtype, bigint>> = {};
  let totalLiquid = 0n;

  for (const a of accounts) {
    const balance = a.openingBalance + (movement.get(a.id) ?? 0n);
    rows.push({ id: a.id, name: a.name, subtype: a.subtype, icon: a.icon, color: a.color, group: a.group, balance });
    if (a.subtype) {
      subtotalsBySubtype[a.subtype] = (subtotalsBySubtype[a.subtype] ?? 0n) + balance;
    }
    if (isLiquidSubtype(a.subtype)) totalLiquid += balance;
  }

  return { accounts: rows, subtotalsBySubtype, totalLiquid };
}

export interface HistoryRow {
  transactionId: string;
  date: Date;
  description: string;
  amount: bigint;
  runningBalance: bigint;
}

/// Per-account passbook / mutasi (§6.1a): postings that touched the account, in
/// chronological order, with a running balance from openingBalance.
export async function accountHistory(
  userId: string,
  accountId: string,
): Promise<HistoryRow[]> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { openingBalance: true },
  });
  if (!account) throw new Error("account not found for this user (§6.0)");

  const postings = await prisma.posting.findMany({
    where: { accountId, transaction: { userId } },
    select: {
      amount: true,
      transaction: { select: { id: true, date: true, description: true } },
    },
    orderBy: [{ transaction: { date: "asc" } }, { createdAt: "asc" }],
  });

  let running = account.openingBalance;
  return postings.map((p) => {
    running += p.amount;
    return {
      transactionId: p.transaction.id,
      date: p.transaction.date,
      description: p.transaction.description,
      amount: p.amount,
      runningBalance: running,
    };
  });
}
