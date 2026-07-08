import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createAccount, seedChartOfAccounts } from "@/lib/accounts";
import { postTransaction } from "@/lib/ledger";
import {
  createInstallmentPurchase,
  dueTimeline,
  formStatement,
  lockedVsRunning,
  outstandingLiabilities,
} from "@/lib/billing";

const email = `views-${Date.now()}@example.com`;
let userId = "";
let cardCreditId = "";
let plCreditId = "";
const acc: Record<string, string> = {};

async function accountId(name: string): Promise<string> {
  const a = await prisma.account.findFirstOrThrow({ where: { userId, name } });
  return a.id;
}
async function setOpening(name: string, magnitude: bigint) {
  const a = await prisma.account.findFirstOrThrow({ where: { userId, name } });
  await prisma.account.update({ where: { id: a.id }, data: { openingBalance: magnitude } });
}

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email, passwordHash: "x" } });
  userId = user.id;
  await seedChartOfAccounts(userId);

  const card = await createAccount(userId, {
    name: "Card BCA",
    type: "LIABILITY",
    subtype: "CREDIT_CARD",
    credit: { instrument: "CREDIT_CARD", statementDay: 1, dueDay: 18, interestRateMonthly: "0.0175" },
  });
  acc.card = card.id;
  cardCreditId = (await prisma.creditAccount.findFirstOrThrow({ where: { accountId: card.id } })).id;

  const pl = await createAccount(userId, {
    name: "SPayLater",
    type: "LIABILITY",
    subtype: "PAYLATER",
    credit: { instrument: "PAYLATER", statementDay: 25, dueOffsetDays: 5, interestRateMonthly: "0" },
  });
  acc.pl = pl.id;
  plCreditId = (await prisma.creditAccount.findFirstOrThrow({ where: { accountId: pl.id } })).id;
});

afterAll(async () => {
  if (userId) {
    await prisma.installmentSchedule.deleteMany({ where: { plan: { creditAccount: { account: { userId } } } } });
    await prisma.installmentPlan.deleteMany({ where: { creditAccount: { account: { userId } } } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.statement.deleteMany({ where: { creditAccount: { account: { userId } } } });
    await prisma.creditAccount.deleteMany({ where: { account: { userId } } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("outstanding liabilities per instrument (§5.6)", () => {
  it("breaks the outstanding magnitude down by instrument", async () => {
    const food = await accountId("Food");
    // Charge 1,000,000 to the card and 500,000 to the paylater.
    await postTransaction({
      userId, date: new Date("2026-06-10"), description: "card buy", type: "EXPENSE",
      postings: [{ accountId: food, amount: 1_000_000n }, { accountId: acc.card, amount: -1_000_000n }],
    });
    await postTransaction({
      userId, date: new Date("2026-06-11"), description: "pl buy", type: "EXPENSE",
      postings: [{ accountId: food, amount: 500_000n }, { accountId: acc.pl, amount: -500_000n }],
    });

    const out = await outstandingLiabilities(userId);
    expect(out.perInstrument.CREDIT_CARD).toBe(1_000_000n);
    expect(out.perInstrument.PAYLATER).toBe(500_000n);
    expect(out.total).toBe(1_500_000n);
  });
});

describe("locked bill vs running spend (§5.6)", () => {
  it("splits cut statements from open-cycle spend", async () => {
    // Close the card's June cycle (statement_day 1 → cut Jul 1) — the 1,000,000
    // card purchase becomes a locked bill.
    await formStatement(userId, cardCreditId, { year: 2026, month: 7 });

    const split = await lockedVsRunning(userId);
    expect(split.lockedBill).toBe(1_000_000n); // the cut card statement
    // The 500,000 paylater purchase is still unstamped (open cycle).
    expect(split.runningSpend).toBe(500_000n);
  });
});

describe("due timeline + cash coverage (§5.6, §6.4, §15.4)", () => {
  it("flips the coverage flag when dues exceed Total Liquid", async () => {
    // Liquid assets total 9,000,000 (the §15.4 setup, condensed).
    await setOpening("Bank BCA", 8_000_000n);
    await setOpening("Wallet Cash", 1_000_000n);

    // A paylater installment purchase due ~within 14 days of asOf.
    const shopping = await accountId("Shopping");
    await createInstallmentPurchase(userId, {
      creditAccountId: plCreditId,
      expenseAccountId: shopping,
      principal: 1_500_000n,
      tenorMonths: 3,
      date: new Date("2026-07-10"),
      description: "installment",
    });

    const asOf = new Date("2026-07-20");
    const timeline = await dueTimeline(userId, { asOf, horizons: [14, 30] });
    expect(timeline.totalLiquid).toBe(9_000_000n);

    // The Jul 1 card statement (due Jul 18) is before asOf, so it's excluded;
    // upcoming dues are the paylater statement + scheduled installments.
    const h30 = timeline.horizons.find((h) => h.horizonDays === 30)!;
    expect(h30.dueTotal).toBeGreaterThan(0n);
    expect(h30.isCoveredByCash).toBe(totalCovered(timeline.totalLiquid, h30.dueTotal));

    // Drop liquidity below the 30-day dues → coverage must be false.
    await setOpening("Bank BCA", 0n);
    await setOpening("Wallet Cash", 0n);
    const poor = await dueTimeline(userId, { asOf, horizons: [30] });
    expect(poor.horizons[0].isCoveredByCash).toBe(false);
  });
});

function totalCovered(liquid: bigint, due: bigint): boolean {
  return liquid >= due;
}
