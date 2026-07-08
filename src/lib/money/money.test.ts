import { describe, expect, it } from "vitest";
import {
  abs,
  add,
  applyRate,
  compare,
  distribute,
  formatIDR,
  isNegative,
  max,
  money,
  parseIDR,
  parseRate,
  subtract,
  sum,
  ZERO,
} from "@/lib/money";

describe("money() construction (§8.1)", () => {
  it("accepts bigint, integer number, and digit strings", () => {
    expect(money(50000n)).toBe(50000n);
    expect(money(50000)).toBe(50000n);
    expect(money("50000")).toBe(50000n);
    expect(money("-501000")).toBe(-501000n);
  });

  it("rejects non-integer numbers (no silent truncation)", () => {
    expect(() => money(1.5)).toThrow(RangeError);
    expect(() => money(0.1 + 0.2)).toThrow(RangeError);
  });

  it("rejects malformed strings", () => {
    expect(() => money("Rp50.000")).toThrow(RangeError);
    expect(() => money("12.5")).toThrow(RangeError);
  });
});

describe("exact arithmetic (§8.2)", () => {
  it("adds and subtracts exactly", () => {
    expect(add(money(500000), money(1000))).toBe(501000n);
    expect(subtract(money(1150000), money(500000))).toBe(650000n);
  });

  it("sums an iterable", () => {
    // §15.4 Total Liquid across six accounts.
    const balances = [5_000_000, 2_000_000, 1_000_000, 250_000, 150_000, 600_000].map(money);
    expect(sum(balances)).toBe(9_000_000n);
  });

  it("abs / max / compare / isNegative behave", () => {
    expect(abs(money(-501000))).toBe(501000n);
    expect(max(money(115000), money(50000))).toBe(115000n);
    expect(compare(money(1), money(2))).toBe(-1);
    expect(isNegative(money(-1))).toBe(true);
    expect(ZERO).toBe(0n);
  });
});

describe("parseRate (§8.2 integer-exact)", () => {
  it("parses decimals into exact fractions", () => {
    expect(parseRate("0.0175")).toEqual({ num: 175n, den: 10000n });
    expect(parseRate("0.10")).toEqual({ num: 10n, den: 100n });
    expect(parseRate("0")).toEqual({ num: 0n, den: 1n });
  });
});

describe("applyRate — round half up (§8.3, golden §15.1)", () => {
  it("minimum due = round(1,150,000 × 0.10) = 115,000", () => {
    expect(applyRate(money(1_150_000), "0.10")).toBe(115_000n);
  });

  it("interest on carried balance = round(650,000 × 0.0175) = 11,375", () => {
    expect(applyRate(money(650_000), "0.0175")).toBe(11_375n);
  });

  it("minimum due = round(1,061,375 × 0.10) = 106,138 (106,137.5 rounds up)", () => {
    expect(applyRate(money(1_061_375), "0.10")).toBe(106_138n);
  });

  it("a bare .5 rounds up", () => {
    expect(applyRate(money(1), "0.5")).toBe(1n); // 0.5 -> 1
    expect(applyRate(money(3), "0.5")).toBe(2n); // 1.5 -> 2
  });

  it("a zero rate yields zero", () => {
    expect(applyRate(money(1_500_000), "0")).toBe(0n);
  });
});

describe("distribute — remainder reconciliation (§8.3)", () => {
  it("splits Rp1,500,000 into 3 equal installments (golden §15.2)", () => {
    const parts = distribute(money(1_500_000), 3);
    expect(parts).toEqual([500_000n, 500_000n, 500_000n]);
    expect(sum(parts)).toBe(1_500_000n);
  });

  it("puts the leftover on the final piece and sums exactly", () => {
    const parts = distribute(money(1000), 3);
    expect(parts).toEqual([333n, 333n, 334n]);
    expect(sum(parts)).toBe(1000n);
  });

  it("a single part returns the whole total", () => {
    expect(distribute(money(777), 1)).toEqual([777n]);
  });

  it("rejects a non-positive count", () => {
    expect(() => distribute(money(100), 0)).toThrow(RangeError);
  });
});

describe("formatIDR / parseIDR (§8.4)", () => {
  it("formats with '.' thousands separators", () => {
    expect(formatIDR(money(1_500_000))).toBe("Rp1.500.000");
    expect(formatIDR(money(0))).toBe("Rp0");
    expect(formatIDR(money(999))).toBe("Rp999");
    expect(formatIDR(money(-2_000_000))).toBe("-Rp2.000.000");
  });

  it("round-trips through parseIDR", () => {
    expect(parseIDR("Rp1.500.000")).toBe(1_500_000n);
    expect(parseIDR("501000")).toBe(501_000n);
    expect(formatIDR(parseIDR("Rp8.999.000"))).toBe("Rp8.999.000");
  });
});
