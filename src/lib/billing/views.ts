// Daily billing views (docs/REQUIREMENTS §5.6, §6.4). Everything here is
// derived: outstanding liabilities from account balances, the locked-vs-running
// split from statements + open-cycle postings, and the due timeline from the
// due_events VIEW (§3.9) joined to the acting user's accounts.
import type { AccountSubtype } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { moneyStorageView } from "@/lib/accounts";

export interface OutstandingLiabilities {
  /// Outstanding magnitude per credit instrument (§5.6).
  perInstrument: Partial<Record<Extract<AccountSubtype, "CREDIT_CARD" | "PAYLATER">, bigint>>;
  perAccount: { accountId: string; name: string; subtype: AccountSubtype | null; outstanding: bigint }[];
  total: bigint;
}

/// Total outstanding liabilities, broken down per instrument (§5.6). Outstanding
/// is the positive magnitude of a (credit-normal, negative) liability balance.
export async function outstandingLiabilities(userId: string, asOf?: Date): Promise<OutstandingLiabilities> {
  const accounts = await prisma.account.findMany({
    where: { userId, type: "LIABILITY", subtype: { in: ["CREDIT_CARD", "PAYLATER"] } },
    select: { id: true, name: true, subtype: true, openingBalance: true },
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

  const perInstrument: OutstandingLiabilities["perInstrument"] = {};
  const perAccount: OutstandingLiabilities["perAccount"] = [];
  let total = 0n;
  for (const a of accounts) {
    const natural = a.openingBalance + (movement.get(a.id) ?? 0n);
    const outstanding = -natural; // credit-normal → magnitude
    perAccount.push({ accountId: a.id, name: a.name, subtype: a.subtype, outstanding });
    total += outstanding;
    if (a.subtype === "CREDIT_CARD" || a.subtype === "PAYLATER") {
      perInstrument[a.subtype] = (perInstrument[a.subtype] ?? 0n) + outstanding;
    }
  }
  return { perInstrument, perAccount, total };
}

export interface LockedVsRunning {
  /// Bills already cut and awaiting payment (CLOSED/PARTIALLY_PAID/OVERDUE).
  lockedBill: bigint;
  /// Spend accumulating in the open cycle (unstamped purchases, not yet billed).
  runningSpend: bigint;
}

/// "Locked bill this month" vs "running spend for next cycle" (§5.6).
export async function lockedVsRunning(userId: string): Promise<LockedVsRunning> {
  const statements = await prisma.statement.findMany({
    where: {
      creditAccount: { account: { userId } },
      status: { in: ["CLOSED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: { statementBalance: true, paidAmount: true },
  });
  const lockedBill = statements.reduce((sum, s) => sum + (s.statementBalance - s.paidAmount), 0n);

  // Running spend: purchases posted to a credit account that aren't stamped into
  // a statement yet (still in the open cycle).
  const openPurchases = await prisma.posting.findMany({
    where: {
      account: { userId, type: "LIABILITY", subtype: { in: ["CREDIT_CARD", "PAYLATER"] } },
      transaction: { statementId: null, type: "EXPENSE" },
    },
    select: { amount: true },
  });
  const runningSpend = openPurchases.reduce((sum, p) => sum + -p.amount, 0n);

  return { lockedBill, runningSpend };
}

export interface DueEvent {
  date: Date;
  type: string;
  amount: bigint;
  accountId: string;
}

export interface HorizonCoverage {
  horizonDays: number;
  dueTotal: bigint;
  isCoveredByCash: boolean;
}

export interface DueTimeline {
  asOf: Date;
  totalLiquid: bigint;
  events: DueEvent[];
  horizons: HorizonCoverage[];
}

/// The upcoming-dues timeline with a cash-coverage indicator (§5.6, §6.4,
/// §15.4). Reads the due_events VIEW (§3.9) for the user's accounts, then
/// checks whether Total Liquid covers cumulative dues within each horizon.
export async function dueTimeline(
  userId: string,
  opts: { asOf?: Date; horizons?: number[] } = {},
): Promise<DueTimeline> {
  const asOf = opts.asOf ?? new Date();
  const horizons = (opts.horizons ?? [7, 14, 30]).slice().sort((a, b) => a - b);
  const maxDate = addDays(asOf, horizons[horizons.length - 1]);

  const rows = await prisma.$queryRaw<
    { date: Date; type: string; amount: bigint; account_id: string }[]
  >`
    SELECT de.date, de.type, de.amount, de.account_id
    FROM due_events de
    JOIN accounts a ON a.id = de.account_id
    WHERE a."userId" = ${userId}
      AND de.date >= ${asOf}
      AND de.date <= ${maxDate}
    ORDER BY de.date ASC
  `;
  const events: DueEvent[] = rows.map((r) => ({
    date: r.date,
    type: r.type,
    amount: r.amount,
    accountId: r.account_id,
  }));

  const { totalLiquid } = await moneyStorageView(userId, asOf);

  const horizonCoverage: HorizonCoverage[] = horizons.map((horizonDays) => {
    const cutoff = addDays(asOf, horizonDays).getTime();
    const dueTotal = events
      .filter((e) => e.date.getTime() <= cutoff)
      .reduce((sum, e) => sum + e.amount, 0n);
    return { horizonDays, dueTotal, isCoveredByCash: totalLiquid >= dueTotal };
  });

  return { asOf, totalLiquid, events, horizons: horizonCoverage };
}
