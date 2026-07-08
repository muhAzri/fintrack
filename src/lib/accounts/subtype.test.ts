import { describe, expect, it } from "vitest";
import {
  assertSubtypeCompatible,
  isCreditSubtype,
  isLiquidSubtype,
  isSubtypeCompatible,
  toNaturalSign,
} from "@/lib/accounts/subtype";

describe("subtype compatibility (§3.1)", () => {
  it("accepts valid ASSET / LIABILITY subtypes", () => {
    expect(isSubtypeCompatible("ASSET", "BANK")).toBe(true);
    expect(isSubtypeCompatible("ASSET", "EWALLET")).toBe(true);
    expect(isSubtypeCompatible("LIABILITY", "CREDIT_CARD")).toBe(true);
    expect(isSubtypeCompatible("LIABILITY", "PAYLATER")).toBe(true);
  });

  it("rejects a subtype from the wrong family", () => {
    expect(isSubtypeCompatible("ASSET", "CREDIT_CARD")).toBe(false);
    expect(isSubtypeCompatible("LIABILITY", "BANK")).toBe(false);
  });

  it("requires ASSET/LIABILITY to have a subtype and forbids one on others", () => {
    expect(isSubtypeCompatible("ASSET", null)).toBe(false);
    expect(isSubtypeCompatible("EXPENSE", null)).toBe(true);
    expect(isSubtypeCompatible("INCOME", null)).toBe(true);
    expect(isSubtypeCompatible("EQUITY", null)).toBe(true);
    expect(isSubtypeCompatible("EXPENSE", "CASH")).toBe(false);
  });

  it("assertSubtypeCompatible throws on a bad pairing", () => {
    expect(() => assertSubtypeCompatible("ASSET", "LOAN")).toThrow(/not valid/);
    expect(() => assertSubtypeCompatible("ASSET", "BANK")).not.toThrow();
  });
});

describe("subtype classifiers (§5.6, §6.1a)", () => {
  it("identifies liquid subtypes (CASH/BANK/EWALLET)", () => {
    expect(isLiquidSubtype("CASH")).toBe(true);
    expect(isLiquidSubtype("BANK")).toBe(true);
    expect(isLiquidSubtype("EWALLET")).toBe(true);
    expect(isLiquidSubtype("INVESTMENT")).toBe(false);
    expect(isLiquidSubtype("RECEIVABLE")).toBe(false);
    expect(isLiquidSubtype(null)).toBe(false);
  });

  it("identifies credit subtypes", () => {
    expect(isCreditSubtype("CREDIT_CARD")).toBe(true);
    expect(isCreditSubtype("PAYLATER")).toBe(true);
    expect(isCreditSubtype("LOAN")).toBe(false);
  });
});

describe("toNaturalSign (§2.1, §3.1)", () => {
  it("keeps debit-normal magnitudes positive", () => {
    expect(toNaturalSign("ASSET", 2_000_000n)).toBe(2_000_000n);
    expect(toNaturalSign("EXPENSE", 50_000n)).toBe(50_000n);
  });

  it("flips credit-normal magnitudes negative", () => {
    expect(toNaturalSign("LIABILITY", 5_000_000n)).toBe(-5_000_000n);
    expect(toNaturalSign("INCOME", 10_000_000n)).toBe(-10_000_000n);
    expect(toNaturalSign("EQUITY", 1_000n)).toBe(-1_000n);
  });
});
