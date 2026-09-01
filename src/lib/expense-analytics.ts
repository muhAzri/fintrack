import type { Expense } from "@/lib/types";

export type RealizedUsage = {
  id: string;
  quantity: number;
  realized_amount: number;
  used_at: string;
  note: string | null;
  stock_item: { name: string; category: string }[] | null;
};

/**
 * "Realized" view: purchases of trackable stock don't count as spent yet (the
 * money left, but the goods are still sitting as inventory), so they're
 * swapped out for the usage entries logged as those goods actually get
 * consumed. Everything else (non-stock expenses) passes through unchanged,
 * which lets this feed straight into the same category/daily-series helpers
 * used for the cash-outflow view.
 */
export function toRealizedExpenses(expenses: Expense[], usages: RealizedUsage[]): Expense[] {
  const nonStockExpenses = expenses.filter((expense) => !expense.stock_item_id);

  const usageExpenses: Expense[] = usages.map((usage) => {
    const stockItem = usage.stock_item?.[0];
    return {
      id: usage.id,
      amount: usage.realized_amount,
      category: stockItem?.category ?? "Lainnya",
      note: stockItem ? `${stockItem.name} (pemakaian)` : "Pemakaian stok",
      spent_at: usage.used_at,
    };
  });

  return [...nonStockExpenses, ...usageExpenses];
}

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00`);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function sumAmounts(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

export function getMonthBounds(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateKey(start), end: toDateKey(end) };
}

export function getPreviousMonthBounds(date: Date): { start: string; end: string } {
  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return getMonthBounds(previousMonth);
}

export function splitByMonth(
  expenses: Expense[],
  today: Date,
): { currentMonthExpenses: Expense[]; previousMonthExpenses: Expense[] } {
  const current = getMonthBounds(today);
  const previous = getPreviousMonthBounds(today);

  return {
    currentMonthExpenses: expenses.filter(
      (expense) => expense.spent_at >= current.start && expense.spent_at <= current.end,
    ),
    previousMonthExpenses: expenses.filter(
      (expense) => expense.spent_at >= previous.start && expense.spent_at <= previous.end,
    ),
  };
}

export type CategoryBreakdown = {
  category: string;
  total: number;
  percentage: number;
};

export function groupByCategory(expenses: Expense[]): CategoryBreakdown[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + amount);
    grandTotal += amount;
  }

  return Array.from(totals.entries())
    .map(([category, total]) => ({
      category,
      total,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export type MonthComparison = {
  currentTotal: number;
  previousMonthToDateTotal: number;
  previousMonthFullTotal: number;
  previousMonthDayCount: number;
  /** null when there's nothing to compare against (no spending on the previous month, up to today's date) */
  percentChange: number | null;
};

export function computeMonthOverMonth(
  currentMonthExpenses: Expense[],
  previousMonthExpenses: Expense[],
  today: Date,
): MonthComparison {
  const dayOfMonth = today.getDate();
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const currentTotal = sumAmounts(currentMonthExpenses);
  const previousMonthFullTotal = sumAmounts(previousMonthExpenses);
  const previousMonthToDateTotal = sumAmounts(
    previousMonthExpenses.filter((expense) => toLocalDate(expense.spent_at).getDate() <= dayOfMonth),
  );

  return {
    currentTotal,
    previousMonthToDateTotal,
    previousMonthFullTotal,
    previousMonthDayCount: daysInMonth(previousMonthDate),
    percentChange:
      previousMonthToDateTotal > 0
        ? ((currentTotal - previousMonthToDateTotal) / previousMonthToDateTotal) * 100
        : null,
  };
}

export type DailySeriesPoint = {
  day: number;
  /** undefined for days after today - lets the chart line stop naturally instead of drawing a false zero */
  currentMonth?: number;
  previousMonth: number;
};

function sumByDay(expenses: Expense[]): Map<number, number> {
  const totals = new Map<number, number>();
  for (const expense of expenses) {
    const day = toLocalDate(expense.spent_at).getDate();
    totals.set(day, (totals.get(day) ?? 0) + Number(expense.amount));
  }
  return totals;
}

export function buildDailySeries(
  currentMonthExpenses: Expense[],
  previousMonthExpenses: Expense[],
  today: Date,
): DailySeriesPoint[] {
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const totalDays = daysInMonth(previousMonthDate);
  const todayDay = today.getDate();

  const currentByDay = sumByDay(currentMonthExpenses);
  const previousByDay = sumByDay(previousMonthExpenses);

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    return {
      day,
      currentMonth: day <= todayDay ? (currentByDay.get(day) ?? 0) : undefined,
      previousMonth: previousByDay.get(day) ?? 0,
    };
  });
}
