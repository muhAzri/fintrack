// Statement arithmetic (docs/REQUIREMENTS §3.6, §5.4, §8, §15.1). Pure integer
// money math — the DB orchestration that gathers these inputs from postings and
// persists a `statements` row lives in the billing DB layer.
import {
  add,
  applyRate,
  isPositive,
  max as maxMoney,
  min as minMoney,
  type Money,
  type Rate,
  subtract,
  sum,
  ZERO,
} from "@/lib/money";

export interface StatementInputs {
  /// Unpaid balance carried from the prior statement (§3.6).
  previousBalance: Money;
  /// Purchases posted within this cycle.
  purchasesTotal: Money;
  /// Installment portion falling due in this cycle.
  installmentsDue?: Money;
  /// Interest charged this cycle.
  interestCharged?: Money;
  /// Fees / late charges this cycle.
  feesCharged?: Money;
  /// Refunds / reversals within this cycle (reduce the balance).
  creditsTotal?: Money;
  /// Payments already applied before the cycle closed.
  paymentsBeforeClose?: Money;
}

/// statement_balance per §3.6:
///   previous + purchases + installmentsDue + interest + fees
///   − credits − paymentsBeforeClose
export function computeStatementBalance(i: StatementInputs): Money {
  const additions = sum([
    i.previousBalance,
    i.purchasesTotal,
    i.installmentsDue ?? ZERO,
    i.interestCharged ?? ZERO,
    i.feesCharged ?? ZERO,
  ]);
  const deductions = add(i.creditsTotal ?? ZERO, i.paymentsBeforeClose ?? ZERO);
  return subtract(additions, deductions);
}

export interface MinimumDueConfig {
  rate?: Rate | string | null;
  floor?: Money | null;
}

/// Minimum payment (§5.4, §15.1): max(round(balance × rate), floor), never more
/// than the balance itself, and 0 when nothing is owed. With no configured rate
/// the whole balance is due.
export function computeMinimumDue(statementBalance: Money, config: MinimumDueConfig = {}): Money {
  if (!isPositive(statementBalance)) return ZERO;
  if (config.rate == null) return statementBalance;

  const byRate = applyRate(statementBalance, config.rate);
  const withFloor = config.floor != null ? maxMoney(byRate, config.floor) : byRate;
  // Can never owe a minimum greater than the whole balance.
  return minMoney(withFloor, statementBalance);
}

/// Interest accrued on the interest-bearing balance carried into the next cycle
/// (§5.4): round(balance × monthlyRate). 0 when nothing is carried.
export function accrueInterest(interestBearingBalance: Money, rate: Rate | string): Money {
  if (!isPositive(interestBearingBalance)) return ZERO;
  return applyRate(interestBearingBalance, rate);
}
