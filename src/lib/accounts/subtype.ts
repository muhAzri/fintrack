// Account subtype rules (docs/REQUIREMENTS §3.1, §6.1a). A subtype must be
// compatible with its account type; INCOME/EXPENSE/EQUITY carry no subtype.
// Pure — no Prisma, no I/O.
import type { AccountSubtype, AccountType } from "@prisma/client";

export const ASSET_SUBTYPES = [
  "CASH",
  "BANK",
  "EWALLET",
  "RECEIVABLE",
  "INVESTMENT",
  "OTHER",
] as const satisfies readonly AccountSubtype[];

export const LIABILITY_SUBTYPES = [
  "CREDIT_CARD",
  "PAYLATER",
  "LOAN",
  "PERSONAL_DEBT",
  "OTHER",
] as const satisfies readonly AccountSubtype[];

/// Liquid asset subtypes that feed "Total Liquid" and the cash-coverage
/// indicator (§5.6, §6.1a, §6.4).
export const LIQUID_SUBTYPES = ["CASH", "BANK", "EWALLET"] as const satisfies readonly AccountSubtype[];

/// Subtypes that require a credit_accounts row with billing parameters (§3.5).
export const CREDIT_SUBTYPES = ["CREDIT_CARD", "PAYLATER"] as const satisfies readonly AccountSubtype[];

function includes(set: readonly AccountSubtype[], value: AccountSubtype | null | undefined): boolean {
  return value != null && set.includes(value);
}

/// True when `subtype` is valid for `type` (§3.1): ASSET/LIABILITY require a
/// subtype from their set; INCOME/EXPENSE/EQUITY require none.
export function isSubtypeCompatible(
  type: AccountType,
  subtype: AccountSubtype | null | undefined,
): boolean {
  switch (type) {
    case "ASSET":
      return includes(ASSET_SUBTYPES, subtype);
    case "LIABILITY":
      return includes(LIABILITY_SUBTYPES, subtype);
    default:
      return subtype == null;
  }
}

export function assertSubtypeCompatible(
  type: AccountType,
  subtype: AccountSubtype | null | undefined,
): void {
  if (!isSubtypeCompatible(type, subtype)) {
    throw new Error(`subtype ${subtype ?? "null"} is not valid for a ${type} account (§3.1)`);
  }
}

export function isLiquidSubtype(subtype: AccountSubtype | null | undefined): boolean {
  return includes(LIQUID_SUBTYPES, subtype);
}

export function isCreditSubtype(subtype: AccountSubtype | null | undefined): boolean {
  return includes(CREDIT_SUBTYPES, subtype);
}

/// Convert a user-entered opening-balance MAGNITUDE (≥ 0) to the stored natural
/// ledger sign (§2.1, §3.1): debit-normal (ASSET/EXPENSE) stays positive;
/// credit-normal (LIABILITY/INCOME/EQUITY) becomes negative. So "I owe 5,000,000
/// on this card" is entered as 5,000,000 and stored as −5,000,000.
export function toNaturalSign(type: AccountType, magnitude: bigint): bigint {
  return type === "ASSET" || type === "EXPENSE" ? magnitude : -magnitude;
}
