import { describe, expect, it } from "vitest";
import { money, subtract } from "@/lib/money";
import { accrueInterest, computeMinimumDue, computeStatementBalance } from "@/lib/billing/statement";

describe("computeStatementBalance (§3.6)", () => {
  it("applies the full §3.6 formula", () => {
    expect(
      computeStatementBalance({
        previousBalance: money(650_000),
        purchasesTotal: money(400_000),
        interestCharged: money(11_375),
      }),
    ).toBe(1_061_375n);
  });

  it("credits and pre-close payments reduce the balance", () => {
    expect(
      computeStatementBalance({
        previousBalance: money(0),
        purchasesTotal: money(1_000_000),
        creditsTotal: money(150_000), // a refund
        paymentsBeforeClose: money(200_000),
      }),
    ).toBe(650_000n);
  });
});

describe("computeMinimumDue (§5.4, §15.1)", () => {
  it("max(round(balance × rate), floor)", () => {
    expect(computeMinimumDue(money(1_150_000), { rate: "0.10", floor: money(50_000) })).toBe(
      115_000n,
    );
  });

  it("rounds half up (1,061,375 × 0.10 = 106,137.5 → 106,138)", () => {
    expect(computeMinimumDue(money(1_061_375), { rate: "0.10", floor: money(50_000) })).toBe(
      106_138n,
    );
  });

  it("the floor wins on small balances but never exceeds the balance", () => {
    expect(computeMinimumDue(money(300_000), { rate: "0.10", floor: money(50_000) })).toBe(50_000n);
    expect(computeMinimumDue(money(40_000), { rate: "0.10", floor: money(50_000) })).toBe(40_000n);
  });

  it("is 0 when nothing is owed, and full balance with no rate", () => {
    expect(computeMinimumDue(money(0), { rate: "0.10" })).toBe(0n);
    expect(computeMinimumDue(money(500_000))).toBe(500_000n);
  });
});

describe("accrueInterest (§5.4, §15.1)", () => {
  it("round(650,000 × 0.0175) = 11,375", () => {
    expect(accrueInterest(money(650_000), "0.0175")).toBe(11_375n);
  });

  it("nothing accrues on a zero/negative carried balance", () => {
    expect(accrueInterest(money(0), "0.0175")).toBe(0n);
    expect(accrueInterest(money(-100_000), "0.0175")).toBe(0n);
  });
});

// Encodes §15.1 end-to-end as pure arithmetic — the numbers must reconcile by
// hand (§11 golden scenario).
describe("golden §15.1 — card over 2 cycles with a partial payment", () => {
  const minConfig = { rate: "0.10", floor: money(50_000) };

  it("cycle 1: statement 1,150,000, minimum 115,000, carried 650,000 after paying 500,000", () => {
    const purchases = money(300_000 + 700_000 + 150_000);
    const statementBalance = computeStatementBalance({
      previousBalance: money(0),
      purchasesTotal: purchases,
    });
    expect(statementBalance).toBe(1_150_000n);
    expect(computeMinimumDue(statementBalance, minConfig)).toBe(115_000n);

    const carried = subtract(statementBalance, money(500_000)); // partial payment
    expect(carried).toBe(650_000n);
  });

  it("cycle 2: interest 11,375, statement 1,061,375, minimum 106,138", () => {
    const carried = money(650_000);
    const interest = accrueInterest(carried, "0.0175");
    expect(interest).toBe(11_375n);

    const statementBalance = computeStatementBalance({
      previousBalance: carried,
      purchasesTotal: money(400_000),
      interestCharged: interest,
    });
    expect(statementBalance).toBe(1_061_375n);
    expect(computeMinimumDue(statementBalance, minConfig)).toBe(106_138n);
  });
});
