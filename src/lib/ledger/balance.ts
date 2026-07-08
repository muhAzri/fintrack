// Deriving balances, net worth, and cash flow from postings (docs/REQUIREMENTS
// §2.1, §2.3, §8.4). P6: the ledger is the truth — balances are ALWAYS derived
// here from openingBalance + Σ postings, never read from a stored field.
//
// Pure functions over plain data (no Prisma) so the §11-mandatory balance and
// net-worth computations are unit-tested in isolation. The DB layer (./index)
// feeds these the same numbers it aggregates from Postgres.
import type { AccountType } from "@prisma/client";
import { add, type Money, negate, subtract, ZERO } from "@/lib/money";

/// Natural-ledger-sign balance (§2.1): openingBalance + Σ posting amounts. A
/// debit-normal account (ASSET/EXPENSE) trends positive; a credit-normal one
/// (LIABILITY/INCOME/EQUITY) trends negative.
export function computeBalance(openingBalance: Money, postingAmounts: Iterable<Money>): Money {
  let balance = openingBalance;
  for (const amount of postingAmounts) balance = add(balance, amount);
  return balance;
}

const DEBIT_NORMAL: ReadonlySet<AccountType> = new Set<AccountType>(["ASSET", "EXPENSE"]);

/// Presentation value (§8.4): ASSET/EXPENSE shown as their positive debit
/// balance; LIABILITY/INCOME/EQUITY shown as the absolute of their (negative)
/// credit balance — e.g. a −2,000,000 card balance displays as 2,000,000.
export function displayBalance(type: AccountType, natural: Money): Money {
  return DEBIT_NORMAL.has(type) ? natural : negate(natural);
}

export interface AccountBalance {
  type: AccountType;
  /// Natural-sign balance (from computeBalance).
  natural: Money;
}

/// Net worth (§2.3): Σ ASSET − Σ LIABILITY, in positive magnitudes. Liability
/// natural balances are negative, so their magnitude is the negation.
export function netWorth(accounts: Iterable<AccountBalance>): Money {
  let assets = ZERO;
  let liabilities = ZERO;
  for (const a of accounts) {
    if (a.type === "ASSET") assets = add(assets, a.natural);
    else if (a.type === "LIABILITY") liabilities = add(liabilities, negate(a.natural));
  }
  return subtract(assets, liabilities);
}

/// Cash flow for a period (§2.3): Σ INCOME − Σ EXPENSE on an accrual basis
/// (expenses count at transaction date, not when a card bill is paid). Income
/// is credit-normal so its magnitude is the negation of the natural balance.
export function cashFlow(accounts: Iterable<AccountBalance>): Money {
  let income = ZERO;
  let expense = ZERO;
  for (const a of accounts) {
    if (a.type === "INCOME") income = add(income, negate(a.natural));
    else if (a.type === "EXPENSE") expense = add(expense, a.natural);
  }
  return subtract(income, expense);
}
