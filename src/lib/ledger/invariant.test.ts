import { describe, expect, it } from "vitest";
import { money } from "@/lib/money";
import {
  assertBalanced,
  balancedPostingsSchema,
  isBalanced,
  sumPostings,
} from "@/lib/ledger/invariant";

// Canonical journal entries from §2.2.
const cashSpend = [
  { accountId: "food", amount: money(50_000) }, // Dr Expense
  { accountId: "cash", amount: money(-50_000) }, // Cr Asset
];
const topUpWithFee = [
  { accountId: "gopay", amount: money(500_000) }, // Dr Asset (§2.2e2)
  { accountId: "fees", amount: money(1_000) }, // Dr Expense: admin fee
  { accountId: "bca", amount: money(-501_000) }, // Cr Asset
];

describe("Σ=0 double-entry invariant (§2.1, §3.4)", () => {
  it("accepts a balanced 2-leg entry", () => {
    expect(isBalanced(cashSpend)).toBe(true);
    expect(() => assertBalanced(cashSpend)).not.toThrow();
  });

  it("accepts a balanced 3-leg transfer-with-fee entry (§2.2e2)", () => {
    expect(sumPostings(topUpWithFee)).toBe(0n);
    expect(() => assertBalanced(topUpWithFee)).not.toThrow();
  });

  it("rejects a single-leg 'transaction'", () => {
    const oneLeg = [{ accountId: "cash", amount: money(50_000) }];
    expect(isBalanced(oneLeg)).toBe(false);
    expect(() => assertBalanced(oneLeg)).toThrow(/>= 2 postings/);
  });

  it("rejects an unbalanced entry (Σ ≠ 0)", () => {
    const bad = [
      { accountId: "food", amount: money(50_000) },
      { accountId: "cash", amount: money(-40_000) },
    ];
    expect(isBalanced(bad)).toBe(false);
    expect(() => assertBalanced(bad)).toThrow(/must be 0 but is 10000/);
  });
});

describe("balancedPostingsSchema (Zod, §3.4)", () => {
  it("parses a balanced entry", () => {
    expect(balancedPostingsSchema.safeParse(cashSpend).success).toBe(true);
  });

  it("fails a <2-leg entry and an unbalanced entry", () => {
    expect(balancedPostingsSchema.safeParse([cashSpend[0]]).success).toBe(false);
    const bad = [
      { accountId: "food", amount: money(50_000) },
      { accountId: "cash", amount: money(-1n) },
    ];
    expect(balancedPostingsSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a non-bigint amount (no float money, P2)", () => {
    const floaty = [
      { accountId: "food", amount: 50_000 },
      { accountId: "cash", amount: -50_000 },
    ];
    expect(balancedPostingsSchema.safeParse(floaty).success).toBe(false);
  });
});
