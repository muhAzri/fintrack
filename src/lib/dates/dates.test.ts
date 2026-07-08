import { describe, expect, it } from "vitest";
import {
  civilDate,
  clampDay,
  cycleForDate,
  daysInMonth,
  dueDateForStatement,
  jakartaCivilDate,
  statementDate,
  toISODate,
  upcomingCycles,
} from "@/lib/dates";

const iso = toISODate;

describe("daysInMonth / clampDay — month-end clamping (§5.5)", () => {
  it("knows month lengths incl. leap years", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("clamps a 31 into shorter months (Feb 31 → 28/29)", () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
    expect(clampDay(2024, 2, 31)).toBe(29);
    expect(clampDay(2026, 4, 31)).toBe(30);
    expect(clampDay(2026, 1, 15)).toBe(15);
  });
});

describe("statementDate — clamped cut-off (§5.5)", () => {
  it("clamps statement_day 31 to the last day of short months", () => {
    expect(iso(statementDate(2026, 2, 31))).toBe("2026-02-28");
    expect(iso(statementDate(2024, 2, 31))).toBe("2024-02-29");
    expect(iso(statementDate(2026, 3, 31))).toBe("2026-03-31");
    expect(iso(statementDate(2026, 4, 31))).toBe("2026-04-30");
  });
});

describe("cycleForDate — cycle assignment (§5.2, golden §15.1)", () => {
  // Card BCA: statement_day = 1. Cycle 1 = Dec 2 – Jan 1, Cycle 2 = Jan 2 – Feb 1.
  it("a mid-cycle purchase lands in the Dec 2 – Jan 1 cycle", () => {
    const c = cycleForDate(civilDate(2025, 12, 15), 1);
    expect([iso(c.periodStart), iso(c.periodEnd)]).toEqual(["2025-12-02", "2026-01-01"]);
  });

  it("a purchase ON the statement day belongs to the CURRENT cycle (≤ rule)", () => {
    const c = cycleForDate(civilDate(2026, 1, 1), 1);
    expect([iso(c.periodStart), iso(c.periodEnd)]).toEqual(["2025-12-02", "2026-01-01"]);
  });

  it("a purchase the day AFTER the statement rolls into the next cycle", () => {
    const c = cycleForDate(civilDate(2026, 1, 2), 1);
    expect([iso(c.periodStart), iso(c.periodEnd)]).toEqual(["2026-01-02", "2026-02-01"]);
  });

  it("handles month-end statement days via clamping (statement_day = 31)", () => {
    // Feb 2026 has no 31st → cycle closes Feb 28; starts the day after Jan 31.
    const c = cycleForDate(civilDate(2026, 2, 15), 31);
    expect([iso(c.periodStart), iso(c.periodEnd)]).toEqual(["2026-02-01", "2026-02-28"]);
  });
});

describe("dueDateForStatement (§3.5, §5.5)", () => {
  it("dueOffsetDays: due = statement + N days (golden §15.2, SPayLater +5)", () => {
    const due = dueDateForStatement(civilDate(2026, 7, 25), { dueOffsetDays: 5 });
    expect(iso(due)).toBe("2026-07-30");
  });

  it("dueDay in the same month when it is after the statement day (§15.1: cut Jan 1, due 18)", () => {
    const due = dueDateForStatement(civilDate(2026, 1, 1), { dueDay: 18 });
    expect(iso(due)).toBe("2026-01-18");
  });

  it("dueDay rolls to next month when it is on/before the statement day", () => {
    // statement 25th, due 18th → next month's 18th.
    const due = dueDateForStatement(civilDate(2026, 1, 25), { dueDay: 18 });
    expect(iso(due)).toBe("2026-02-18");
  });

  it("clamps a month-end dueDay in the same month (statement Feb 15, due 31 → Feb 28)", () => {
    const due = dueDateForStatement(civilDate(2026, 2, 15), { dueDay: 31 });
    expect(iso(due)).toBe("2026-02-28");
  });

  it("clamps a month-end dueDay that rolls to a short next month (statement Jan 31, due 30 → Feb 28)", () => {
    const due = dueDateForStatement(civilDate(2026, 1, 31), { dueDay: 30 });
    expect(iso(due)).toBe("2026-02-28");
  });

  it("rejects setting neither or both of dueDay / dueOffsetDays", () => {
    // @ts-expect-error — neither field set
    expect(() => dueDateForStatement(civilDate(2026, 1, 1), {})).toThrow(RangeError);
    expect(() =>
      // @ts-expect-error — both fields set
      dueDateForStatement(civilDate(2026, 1, 1), { dueDay: 5, dueOffsetDays: 5 }),
    ).toThrow(RangeError);
  });
});

describe("upcomingCycles — preview boundaries + due dates (§6.1)", () => {
  it("projects 3 cycles for statement_day=1, due_day=25 with clamping", () => {
    const cycles = upcomingCycles(civilDate(2026, 7, 8), 1, { dueDay: 25 }, 3);
    expect(
      cycles.map((c) => [iso(c.periodStart), iso(c.periodEnd), iso(c.dueDate)]),
    ).toEqual([
      ["2026-07-02", "2026-08-01", "2026-08-25"],
      ["2026-08-02", "2026-09-01", "2026-09-25"],
      ["2026-09-02", "2026-10-01", "2026-10-25"],
    ]);
  });

  it("rejects a non-positive count", () => {
    expect(() => upcomingCycles(civilDate(2026, 7, 8), 1, { dueDay: 25 }, 0)).toThrow(RangeError);
  });
});

describe("jakartaCivilDate — instant → WIB calendar date (§7)", () => {
  it("keeps a UTC-midnight civil date on the same day", () => {
    expect(iso(jakartaCivilDate(civilDate(2026, 1, 1)))).toBe("2026-01-01");
  });

  it("rolls a late-UTC instant into the next Jakarta day (UTC+7)", () => {
    // 2026-01-01T20:00Z is 2026-01-02T03:00 in Jakarta.
    expect(iso(jakartaCivilDate(new Date("2026-01-01T20:00:00Z")))).toBe("2026-01-02");
  });
});
