// DB-backed test for importing an EXISTING, in-progress installment plan
// (docs/REQUIREMENTS §4, §5.3, §13.4). Verifies the debt is recognized against
// Opening Balance equity — NOT an expense — and that only the remaining
// installments are scheduled. Runs behind `yarn test:db`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { seedChartOfAccounts, createAccount } from "@/lib/accounts";
import { getAccountBalance } from "@/lib/ledger";
import { importExistingInstallmentPlan } from "@/lib/billing";

const email = `import-${Date.now()}@example.com`;
let userId = "";
let paylaterCreditId = "";
let paylaterAccountId = "";

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email, passwordHash: "x" } });
  userId = user.id;
  await seedChartOfAccounts(userId);

  const pl = await createAccount(userId, {
    name: "Kredivo",
    type: "LIABILITY",
    subtype: "PAYLATER",
    credit: {
      instrument: "PAYLATER",
      statementDay: 25,
      dueOffsetDays: 5,
      interestRateMonthly: "0",
    },
  });
  paylaterAccountId = pl.id;
  const ca = await prisma.creditAccount.findFirstOrThrow({ where: { accountId: pl.id } });
  paylaterCreditId = ca.id;
});

afterAll(async () => {
  if (userId) {
    await prisma.installmentSchedule.deleteMany({ where: { plan: { creditAccount: { account: { userId } } } } });
    await prisma.installmentPlan.deleteMany({ where: { creditAccount: { account: { userId } } } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.creditAccount.deleteMany({ where: { account: { userId } } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("importExistingInstallmentPlan — fixed installment, no interest (§13.4)", () => {
  it("recognizes the remaining debt against equity and schedules the rest", async () => {
    const { transaction, plan } = await importExistingInstallmentPlan(userId, {
      creditAccountId: paylaterCreditId,
      remainingPrincipal: 21_000_000n,
      remainingTenor: 14,
      monthlyAmount: 1_500_000n, // exactly principal/tenor → 0% interest
      date: new Date("2026-07-09"),
      description: "Kredivo — sisa cicilan HP",
    });

    // Booked as an opening-balance adjustment, never an expense.
    expect(transaction.type).toBe("ADJUSTMENT");

    // Liability now shows the full remaining balance owed (credit-normal → −).
    const liability = await getAccountBalance(userId, paylaterAccountId);
    expect(liability).toBe(-21_000_000n);

    // The offsetting leg lands on Opening Balance equity, not any expense.
    const equity = await prisma.account.findFirstOrThrow({
      where: { userId, type: "EQUITY", name: "Opening Balance" },
    });
    const equityBalance = await getAccountBalance(userId, equity.id);
    expect(equityBalance).toBe(21_000_000n);

    // Plan holds only the remaining 14 installments, 0% interest.
    expect(plan.tenorMonths).toBe(14);
    expect(plan.monthlyAmount).toBe(1_500_000n);

    const schedules = await prisma.installmentSchedule.findMany({
      where: { planId: plan.id },
      orderBy: { sequence: "asc" },
    });
    expect(schedules).toHaveLength(14);
    expect(schedules.every((s) => s.interestComponent === 0n)).toBe(true);
    const principalSum = schedules.reduce((acc, s) => acc + s.principalComponent, 0n);
    expect(principalSum).toBe(21_000_000n);
  });
});
