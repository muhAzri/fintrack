// Money — integer rupiah primitive (docs/REQUIREMENTS §8).
//
// P2: money is ALWAYS an integer in the smallest currency unit (1 = Rp1),
// represented as `bigint`. Floating-point `number` for monetary values is
// forbidden. §8.2: addition/subtraction are exact on integers; multiplication
// by a rate yields a fraction that MUST be rounded immediately to an integer
// rupiah (§8.3, round-half-up). All rate math stays in integers by carrying the
// rate as an exact numerator/denominator fraction — never a float.

/// Branded integer rupiah. Construct via `money()`; combine via the helpers in
/// this module so results stay branded (and integer) end to end.
export type Money = bigint & { readonly __brand: "Money" };

/// A rate expressed as an exact integer fraction (§8.2) — e.g. 1.75%/month is
/// { num: 175n, den: 10000n }. Kept exact so all computation is integer.
export interface Rate {
  readonly num: bigint;
  readonly den: bigint;
}

export const ZERO: Money = 0n as Money;

/// Build a Money from a bigint, an integer number, or a plain digit string.
/// Rejects non-integer numbers and malformed strings — there is no silent
/// truncation of fractional rupiah.
export function money(value: bigint | number | string): Money {
  if (typeof value === "bigint") return value as Money;
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new RangeError(`money() requires an integer, got ${value}`);
    }
    return BigInt(value) as Money;
  }
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new RangeError(`money() cannot parse "${value}"`);
  }
  return BigInt(trimmed) as Money;
}

// --- exact arithmetic (§8.2) --------------------------------------------------

export function add(a: Money, b: Money): Money {
  return (a + b) as Money;
}

export function subtract(a: Money, b: Money): Money {
  return (a - b) as Money;
}

export function negate(a: Money): Money {
  return -a as Money;
}

export function abs(a: Money): Money {
  return (a < 0n ? -a : a) as Money;
}

export function sum(values: Iterable<Money>): Money {
  let total = 0n;
  for (const v of values) total += v;
  return total as Money;
}

export function max(a: Money, b: Money): Money {
  return (a >= b ? a : b) as Money;
}

export function min(a: Money, b: Money): Money {
  return (a <= b ? a : b) as Money;
}

/// -1 | 0 | 1
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isZero(a: Money): boolean {
  return a === 0n;
}

export function isNegative(a: Money): boolean {
  return a < 0n;
}

export function isPositive(a: Money): boolean {
  return a > 0n;
}

// --- rounding & rate application (§8.2, §8.3) --------------------------------

/// Floor division toward −∞ (bigint `/` truncates toward zero, so correct for
/// negative dividends). Divisor must be positive.
function floorDiv(a: bigint, b: bigint): bigint {
  const q = a / b;
  const r = a % b;
  return r !== 0n && r < 0n ? q - 1n : q;
}

/// Round a/b to the nearest integer, half-up toward +∞ (§8.3 default). Divisor
/// must be positive. floor((2a + b) / 2b) implements "add a half, then floor".
function divRoundHalfUp(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new RangeError("denominator must be positive");
  return floorDiv(2n * a + b, 2n * b);
}

/// Parse a decimal rate string ("0.0175", "0.10", "0") into an exact fraction.
/// Stays integer-exact — no float ever touches the value.
export function parseRate(decimal: string): Rate {
  const trimmed = decimal.trim();
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!m) throw new RangeError(`parseRate cannot parse "${decimal}"`);
  const [, sign, intPart, fracPart = ""] = m;
  const num = BigInt((sign === "-" ? "-" : "") + intPart + fracPart);
  const den = 10n ** BigInt(fracPart.length);
  return { num, den };
}

/// value × (num/den), rounded once to whole rupiah (round-half-up, §8.3).
/// Interest, minimum-payment, and similar rate math funnel through here so the
/// rounding step is single and consistent.
export function applyRate(value: Money, rate: Rate | string): Money {
  const { num, den } = typeof rate === "string" ? parseRate(rate) : rate;
  if (den <= 0n) throw new RangeError("rate denominator must be positive");
  // value*num may be negative; divRoundHalfUp needs a positive denominator, so
  // fold any sign of `num` into the numerator.
  return divRoundHalfUp(value * num, den) as Money;
}

/// Split `total` into `parts` whole-rupiah pieces that sum EXACTLY to `total`.
/// Each piece is floor(total/parts); the leftover remainder lands on the final
/// piece (§8.3: "put the leftover on the final installment"). Never lets
/// Σ pieces ≠ total.
export function distribute(total: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new RangeError(`distribute needs a positive integer count, got ${parts}`);
  }
  const n = BigInt(parts);
  const base = floorDiv(total, n < 0n ? -n : n);
  const result: Money[] = [];
  let allocated = 0n;
  for (let i = 0; i < parts - 1; i++) {
    result.push(base as Money);
    allocated += base;
  }
  result.push((total - allocated) as Money);
  return result;
}

// --- display & input (§8.4) --------------------------------------------------

/// Format whole rupiah for the Asia/Jakarta locale: "Rp1.500.000" (thousands
/// separated by "."). Negative amounts render as "-Rp1.500.000".
export function formatIDR(value: Money): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp${grouped}`;
}

/// Parse a user-entered rupiah string back to Money. Accepts an optional "Rp"
/// prefix and "." thousands separators (e.g. "Rp1.500.000" -> 1500000n).
export function parseIDR(input: string): Money {
  const cleaned = input.trim().replace(/^Rp/i, "").replace(/\./g, "").replace(/\s/g, "");
  return money(cleaned);
}
