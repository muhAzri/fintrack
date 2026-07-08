import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { seedChartOfAccounts, createAccount } from "@/lib/accounts";
import { getAccountBalance, postTransaction } from "@/lib/ledger";
import {
  createInstallmentPurchase,
  formStatement,
  recordCardPayment,
} from "@/lib/billing";

const email = `billing-${Date.now()}@example.com`;
let userId = "";
const acc: Record<string, string> = {};

async function accountId(name: string): Promise<string> {
  const a = await prisma.account.findFirstOrThrow({ where: { userId, name } });
  return a.id;
}

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email, passwordHash: "x" } });
  userId = user.id;
  await seedChartOfAccounts(userId);
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

// §15.1 — Card BCA: statement_day 1, due_day 18, interest 1.75%/mo,
// min-payment 10% floor 50,000.
describe("golden §15.1 — credit card over 2 cycles with a partial payment", () => {
  let cardCreditId = "";

  beforeAll(async () => {
    const card = await createAccount(userId, {
      name: "Card BCA",
      type: "LIABILITY",
      subtype: "CREDIT_CARD",
      credit: {
        instrument: "CREDIT_CARD",
        statementDay: 1,
        dueDay: 18,
        interestRateMonthly: "0.0175",
        minPaymentRate: "0.10",
        minPaymentFloor: 50_000n,
      },
    });
    const ca = await prisma.creditAccount.findFirstOrThrow({ where: { accountId: card.id } });
    cardCreditId = ca.id;
    acc.card = card.id;

    const food = await accountId("Food");
    const shopping = await accountId("Shopping");
    const transport = await accountId("Transport");
    // Cycle 1 purchases (posted Dec 2025, inside Dec 2 – Jan 1).
    for (const [expense, amount] of [
      [food, 300_000n],
      [shopping, 700_000n],
      [transport, 150_000n],
    ] as const) {
      await postTransaction({
        userId,
        date: new Date("2025-12-15"),
        description: "Cycle-1 purchase",
        type: "EXPENSE",
        postings: [
          { accountId: expense, amount },
          { accountId: acc.card, amount: -amount },
        ],
      });
    }
  });

  it("cycle 1 closes at 1,150,000 with a 115,000 minimum", async () => {
    const { statement, created } = await formStatement(userId, cardCreditId, { year: 2026, month: 1 });
    expect(created).toBe(true);
    expect(statement.statementBalance).toBe(1_150_000n);
    expect(statement.minimumDue).toBe(115_000n);
    expect(statement.status).toBe("CLOSED");
  });

  it("formation is idempotent — re-forming the same cycle does nothing", async () => {
    const before = await prisma.transaction.count({ where: { userId } });
    const { created } = await formStatement(userId, cardCreditId, { year: 2026, month: 1 });
    expect(created).toBe(false);
    expect(await prisma.transaction.count({ where: { userId } })).toBe(before);
  });

  it("a partial 500,000 payment marks the statement PARTIALLY_PAID", async () => {
    const bca = await accountId("Bank BCA");
    const { statement } = await recordCardPayment(userId, {
      creditAccountId: cardCreditId,
      sourceAccountId: bca,
      amount: 500_000n,
      date: new Date("2026-01-15"),
    });
    expect(statement?.paidAmount).toBe(500_000n);
    expect(statement?.status).toBe("PARTIALLY_PAID");
  });

  it("cycle 2 accrues 11,375 interest and closes at 1,061,375 (min 106,138)", async () => {
    const groceries = await accountId("Food");
    await postTransaction({
      userId,
      date: new Date("2026-01-20"),
      description: "Cycle-2 groceries",
      type: "EXPENSE",
      postings: [
        { accountId: groceries, amount: 400_000n },
        { accountId: acc.card, amount: -400_000n },
      ],
    });

    const { statement } = await formStatement(userId, cardCreditId, { year: 2026, month: 2 });
    expect(statement.previousBalance).toBe(650_000n); // 1,150,000 − 500,000
    expect(statement.interestCharged).toBe(11_375n); // round(650,000 × 0.0175)
    expect(statement.purchasesTotal).toBe(400_000n);
    expect(statement.statementBalance).toBe(1_061_375n);
    expect(statement.minimumDue).toBe(106_138n);

    // §15.1 check: the liability balance itself equals the statement balance.
    expect(await getAccountBalance(userId, acc.card)).toBe(-1_061_375n);
  });
});

// §15.2 — SPayLater: statement_day 25, due = statement + 5 days, 0% installments.
describe("golden §15.2 — paylater 3× installment (0%)", () => {
  let plCreditId = "";

  beforeAll(async () => {
    const pl = await createAccount(userId, {
      name: "SPayLater",
      type: "LIABILITY",
      subtype: "PAYLATER",
      credit: { instrument: "PAYLATER", statementDay: 25, dueOffsetDays: 5, interestRateMonthly: "0" },
    });
    const ca = await prisma.creditAccount.findFirstOrThrow({ where: { accountId: pl.id } });
    plCreditId = ca.id;
    acc.pl = pl.id;
  });

  it("recognizes the full liability and generates a 3-month schedule", async () => {
    const shopping = await accountId("Shopping");
    const { plan } = await createInstallmentPurchase(userId, {
      creditAccountId: plCreditId,
      expenseAccountId: shopping,
      principal: 1_500_000n,
      tenorMonths: 3,
      date: new Date("2026-07-10"),
      description: "3× item",
    });
    expect(plan.monthlyAmount).toBe(500_000n);
    // Full liability recognized up front.
    expect(await getAccountBalance(userId, acc.pl)).toBe(-1_500_000n);

    const schedules = await prisma.installmentSchedule.findMany({
      where: { planId: plan.id },
      orderBy: { sequence: "asc" },
    });
    expect(schedules.map((s) => s.totalAmount)).toEqual([500_000n, 500_000n, 500_000n]);
    expect(schedules.map((s) => s.dueDate.toISOString().slice(0, 10))).toEqual([
      "2026-07-30",
      "2026-08-30",
      "2026-09-30",
    ]);
  });

  it("bills 500,000 per cycle and returns the liability to 0 after 3 payments", async () => {
    const bca = await accountId("Bank BCA");
    for (const month of [7, 8, 9]) {
      const { statement } = await formStatement(userId, plCreditId, { year: 2026, month });
      expect(statement.installmentsDue).toBe(500_000n);
      expect(statement.statementBalance).toBe(500_000n);
      await recordCardPayment(userId, {
        creditAccountId: plCreditId,
        sourceAccountId: bca,
        amount: 500_000n,
        date: new Date(`2026-0${month}-28`),
        statementId: statement.id,
      });
    }
    // Across all three cycles total billed = 1,500,000; liability back to 0.
    expect(await getAccountBalance(userId, acc.pl)).toBe(0n);
    const paid = await prisma.statement.findMany({ where: { creditAccountId: plCreditId } });
    expect(paid.every((s) => s.status === "PAID")).toBe(true);
  });
});
