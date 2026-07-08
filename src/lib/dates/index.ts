// Billing-cycle date math (docs/REQUIREMENTS §5.2, §5.5, §7, §13.6).
//
// Cycle boundaries are pure CALENDAR-date logic evaluated in Asia/Jakarta
// (§7, §13.6) — not instants. To stay free of timezone drift we model every
// billing date as a "civil date": a Date pinned to UTC midnight whose Y/M/D is
// read with the getUTC* accessors. This matches how Prisma `@db.Date` columns
// round-trip (UTC midnight) and sidesteps the local-timezone footgun that
// date-fns' default (machine-local) operations would introduce here. Real
// timestamps (e.g. "now") are converted to the Jakarta calendar date first via
// jakartaCivilDate().

/// Asia/Jakarta is WIB = UTC+7, fixed (no DST). One offset, forever.
export const JAKARTA_UTC_OFFSET_MINUTES = 7 * 60;

// --- civil-date primitives ---------------------------------------------------

/// Number of days in a given month. `month` is 1-based (1 = January).
/// Day 0 of the *next* month is the last day of this one.
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/// Clamp a day-of-month into the valid range for that month (§5.5): a
/// statement/due day of 29–31 collapses to the month's last day (Feb 31 → 28/29).
export function clampDay(year: number, month: number, day: number): number {
  const max = daysInMonth(year, month);
  return day < 1 ? 1 : day > max ? max : day;
}

/// Construct a civil date (UTC midnight) from 1-based month + day.
export function civilDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/// Strip any time-of-day, keeping the UTC calendar date. Idempotent on values
/// already produced here.
export function toCivilDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/// Add whole days. Safe on civil dates because UTC has no DST — a day is always
/// 86,400,000 ms.
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/// ISO YYYY-MM-DD of a civil date — handy for logging and test assertions.
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/// Convert a real instant to the Asia/Jakarta calendar date (§7). A civil date
/// already at UTC midnight is returned unchanged (midnight + 7h is the same day).
export function jakartaCivilDate(instant: Date): Date {
  const shifted = new Date(instant.getTime() + JAKARTA_UTC_OFFSET_MINUTES * 60_000);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
}

function ymd(d: Date): { year: number; month: number; day: number } {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/// Shift a (year, 1-based month) pair by `delta` months, normalizing overflow.
function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/// The statement/cut-off date for a given month, with month-end clamping (§5.5).
export function statementDate(year: number, month: number, statementDay: number): Date {
  return civilDate(year, month, clampDay(year, month, statementDay));
}

// --- cycle assignment (§5.2) -------------------------------------------------

export interface Cycle {
  /// First day of the cycle: the day AFTER the previous statement date.
  periodStart: Date;
  /// Last day of the cycle = the statement/cut-off date.
  periodEnd: Date;
}

/// Which billing cycle a posted date falls into (§5.2). The cycle runs from
/// (previous statement date + 1 day) through (this statement date). A date on
/// the statement day belongs to the CURRENT cycle (the "≤" rule, §5.5); a date
/// after it rolls into the next cycle.
export function cycleForDate(date: Date, statementDay: number): Cycle {
  const d = toCivilDate(date);
  const { year, month } = ymd(d);
  const closeThisMonth = statementDate(year, month, statementDay);

  if (d.getTime() <= closeThisMonth.getTime()) {
    const prev = addMonths(year, month, -1);
    const closePrev = statementDate(prev.year, prev.month, statementDay);
    return { periodStart: addDays(closePrev, 1), periodEnd: closeThisMonth };
  }

  const next = addMonths(year, month, 1);
  const closeNext = statementDate(next.year, next.month, statementDay);
  return { periodStart: addDays(closeThisMonth, 1), periodEnd: closeNext };
}

// --- due-date derivation (§3.5, §5.5) ----------------------------------------

/// Exactly one of dueDay / dueOffsetDays is set (§3.5). Credit cards typically
/// use a fixed dueDay; paylater often uses an offset from the statement date.
export type DueConfig =
  | { dueDay: number; dueOffsetDays?: null }
  | { dueOffsetDays: number; dueDay?: null };

/// The payment due date for a statement that closed on `periodEnd` (§3.5, §5.5).
/// - dueOffsetDays: due = statement date + N days (§15.2).
/// - dueDay: the next occurrence of that day-of-month after the statement — same
///   month when dueDay > statement day, otherwise the following month — with
///   month-end clamping.
export function dueDateForStatement(periodEnd: Date, due: DueConfig): Date {
  const hasDay = due.dueDay != null;
  const hasOffset = due.dueOffsetDays != null;
  if (hasDay === hasOffset) {
    throw new RangeError("exactly one of dueDay / dueOffsetDays must be set (§3.5)");
  }

  const end = toCivilDate(periodEnd);
  if (hasOffset) return addDays(end, due.dueOffsetDays as number);

  const { year, month, day } = ymd(end);
  const dueDay = due.dueDay as number;
  if (dueDay > day) {
    return civilDate(year, month, clampDay(year, month, dueDay));
  }
  const next = addMonths(year, month, 1);
  return civilDate(next.year, next.month, clampDay(next.year, next.month, dueDay));
}

// --- projecting upcoming cycles (§6.1 acceptance) ----------------------------

export interface CycleWithDue extends Cycle {
  dueDate: Date;
}

/// Project the current forming cycle plus the following ones from `from` — used
/// to preview cycle boundaries and due dates when a card is created (§6.1).
export function upcomingCycles(
  from: Date,
  statementDay: number,
  due: DueConfig,
  count: number,
): CycleWithDue[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`upcomingCycles needs a positive integer count, got ${count}`);
  }
  const out: CycleWithDue[] = [];
  let cycle = cycleForDate(from, statementDay);
  for (let i = 0; i < count; i++) {
    out.push({ ...cycle, dueDate: dueDateForStatement(cycle.periodEnd, due) });
    const { year, month } = ymd(cycle.periodEnd);
    const next = addMonths(year, month, 1);
    cycle = {
      periodStart: addDays(cycle.periodEnd, 1),
      periodEnd: statementDate(next.year, next.month, statementDay),
    };
  }
  return out;
}
