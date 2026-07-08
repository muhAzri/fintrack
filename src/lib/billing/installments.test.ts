import { describe, expect, it } from "vitest";
import { money, sum } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import {
  generateInstallmentSchedule,
  installmentPlanTotal,
} from "@/lib/billing/installments";

describe("golden §15.2 — paylater 3× installment (0%)", () => {
  const plan = generateInstallmentSchedule({
    principal: money(1_500_000),
    tenorMonths: 3,
    interestRateMonthly: "0",
    startYear: 2026,
    startMonth: 7, // July cycle
    statementDay: 25,
    due: { dueOffsetDays: 5 }, // due = statement + 5 days
  });

  it("splits into 3 × 500,000 with zero interest", () => {
    expect(plan.monthlyAmount).toBe(500_000n);
    expect(plan.schedule.map((r) => r.principalComponent)).toEqual([500_000n, 500_000n, 500_000n]);
    expect(plan.schedule.every((r) => r.interestComponent === 0n)).toBe(true);
  });

  it("due dates land on Jul 30 / Aug 30 / Sep 30 (statement + 5)", () => {
    expect(plan.schedule.map((r) => toISODate(r.dueDate))).toEqual([
      "2026-07-30",
      "2026-08-30",
      "2026-09-30",
    ]);
  });

  it("total billed = the original 1,500,000 liability", () => {
    expect(installmentPlanTotal(plan)).toBe(1_500_000n);
    expect(sum(plan.schedule.map((r) => r.totalAmount))).toBe(1_500_000n);
  });
});

describe("installment schedule — remainder & interest (§5.3, §8.3)", () => {
  it("reconciles a non-divisible principal on the final installment", () => {
    const plan = generateInstallmentSchedule({
      principal: money(1_000_000),
      tenorMonths: 3,
      interestRateMonthly: "0",
      startYear: 2026,
      startMonth: 1,
      statementDay: 1,
      due: { dueDay: 15 },
    });
    expect(plan.schedule.map((r) => r.principalComponent)).toEqual([333_333n, 333_333n, 333_334n]);
    expect(sum(plan.schedule.map((r) => r.principalComponent))).toBe(1_000_000n);
  });

  it("applies flat monthly interest on the original principal", () => {
    // 1,200,000 @ 1.75%/month flat → interest 21,000 each month.
    const plan = generateInstallmentSchedule({
      principal: money(1_200_000),
      tenorMonths: 3,
      interestRateMonthly: "0.0175",
      startYear: 2026,
      startMonth: 1,
      statementDay: 1,
      due: { dueDay: 15 },
    });
    expect(plan.schedule.every((r) => r.interestComponent === 21_000n)).toBe(true);
    expect(plan.monthlyAmount).toBe(421_000n); // 400,000 principal + 21,000 interest
  });

  it("crosses a year boundary correctly", () => {
    const plan = generateInstallmentSchedule({
      principal: money(600_000),
      tenorMonths: 3,
      interestRateMonthly: "0",
      startYear: 2026,
      startMonth: 11, // Nov 2026 → Dec 2026 → Jan 2027
      statementDay: 20,
      due: { dueDay: 5 },
    });
    expect(plan.schedule.map((r) => toISODate(r.dueDate))).toEqual([
      "2026-12-05",
      "2027-01-05",
      "2027-02-05",
    ]);
  });
});
