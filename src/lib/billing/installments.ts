// Installment schedule generation (docs/REQUIREMENTS §5.3, §8.3, §15.2).
//
// Decision (§5.3): the FULL liability is recognized up front at purchase (a
// single Dr Expense / Cr Liability entry); the schedule here only shapes how
// that debt is billed across cycles. Each installment's due date aligns with
// the statement due date of its cycle (§15.2). Pure — no Prisma.
import { distribute, type Money, add, applyRate, money, type Rate } from "@/lib/money";
import { dueDateForStatement, type DueConfig, statementDate } from "@/lib/dates";

export interface InstallmentRow {
  sequence: number; // 1..tenor
  dueDate: Date;
  principalComponent: Money;
  interestComponent: Money;
  totalAmount: Money;
}

export interface GeneratedInstallmentPlan {
  /// The scheduled amount for a typical (non-final) month = round(principal /
  /// tenor) + interest (§5.3).
  monthlyAmount: Money;
  schedule: InstallmentRow[];
}

export interface GenerateInstallmentInput {
  principal: Money;
  tenorMonths: number;
  /// Flat monthly rate on the original principal (MVP model, §13.4). 0 for a
  /// 0% plan.
  interestRateMonthly: Rate | string;
  /// The cycle month in which the FIRST installment is billed (§15.2 start_date).
  startYear: number;
  startMonth: number; // 1-based
  statementDay: number;
  due: DueConfig;
}

/// Build the installment schedule (§5.3). Principal is split with the remainder
/// reconciled on the FINAL installment so Σ principal = principal exactly (§8.3).
/// Interest is flat on the original principal each month (MVP, §13.4).
export function generateInstallmentSchedule(
  input: GenerateInstallmentInput,
): GeneratedInstallmentPlan {
  const { principal, tenorMonths, interestRateMonthly, startYear, startMonth, statementDay, due } =
    input;
  if (!Number.isInteger(tenorMonths) || tenorMonths < 1) {
    throw new RangeError(`tenorMonths must be a positive integer, got ${tenorMonths}`);
  }

  const principalParts = distribute(principal, tenorMonths);
  const interestPerMonth = applyRate(principal, interestRateMonthly);

  const schedule: InstallmentRow[] = [];
  for (let k = 0; k < tenorMonths; k++) {
    const monthIndex = startMonth - 1 + k;
    const year = startYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const dueDate = dueDateForStatement(statementDate(year, month, statementDay), due);

    const principalComponent = principalParts[k];
    schedule.push({
      sequence: k + 1,
      dueDate,
      principalComponent,
      interestComponent: interestPerMonth,
      totalAmount: add(principalComponent, interestPerMonth),
    });
  }

  const monthlyAmount = add(principalParts[0], interestPerMonth);
  return { monthlyAmount, schedule };
}

/// Total that will be billed across the whole plan (principal + all interest).
export function installmentPlanTotal(plan: GeneratedInstallmentPlan): Money {
  let total = money(0);
  for (const row of plan.schedule) total = add(total, row.totalAmount);
  return total;
}
