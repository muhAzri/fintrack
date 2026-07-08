import { describe, expect, it } from "vitest";
import type { AccountType } from "@prisma/client";
import { type Money, money } from "@/lib/money";
import {
  type AccountBalance,
  cashFlow,
  computeBalance,
  displayBalance,
  netWorth,
} from "@/lib/ledger/balance";

type Leg = { accountId: string; amount: Money };

/// A tiny in-memory ledger: fold a list of transactions (each a set of legs)
/// into a natural-sign balance per account, given opening balances + types.
function ledger(
  accounts: Record<string, { type: AccountType; opening?: number }>,
  ...transactions: Leg[][]
) {
  const legs = transactions.flat();
  const naturalOf = (id: string): Money =>
    computeBalance(
      money(accounts[id].opening ?? 0),
      legs.filter((l) => l.accountId === id).map((l) => l.amount),
    );
  const balances = (): AccountBalance[] =>
    Object.entries(accounts).map(([id, a]) => ({ type: a.type, natural: naturalOf(id) }));
  return { naturalOf, balances };
}

describe("computeBalance & displayBalance (§2.1, §8.4)", () => {
  it("derives natural-sign balances", () => {
    // A card charged 50,000 has a −50,000 natural (credit) balance.
    expect(computeBalance(money(0), [money(-50_000)])).toBe(-50_000n);
    // A bank with 2,000,000 opening less a 1,150,000 outflow.
    expect(computeBalance(money(2_000_000), [money(-1_150_000)])).toBe(850_000n);
  });

  it("presents debit- and credit-normal accounts as positive magnitudes (§8.4)", () => {
    expect(displayBalance("ASSET", money(850_000))).toBe(850_000n);
    expect(displayBalance("EXPENSE", money(1_150_000))).toBe(1_150_000n);
    expect(displayBalance("LIABILITY", money(-2_000_000))).toBe(2_000_000n);
    expect(displayBalance("INCOME", money(-10_000_000))).toBe(10_000_000n);
  });
});

describe("golden §15.3 — a bill payment is NOT an expense", () => {
  const accounts = {
    bank: { type: "ASSET" as AccountType, opening: 2_000_000 },
    cash: { type: "ASSET" as AccountType, opening: 0 },
    card: { type: "LIABILITY" as AccountType, opening: 0 },
    food: { type: "EXPENSE" as AccountType, opening: 0 },
  };
  // (b) Spend 1,150,000 on the CREDIT CARD: liability rises, cash untouched.
  const purchase: Leg[] = [
    { accountId: "food", amount: money(1_150_000) },
    { accountId: "card", amount: money(-1_150_000) },
  ];
  // (c) Pay the 1,150,000 bill from the bank: a TRANSFER, not an expense.
  const payment: Leg[] = [
    { accountId: "card", amount: money(1_150_000) },
    { accountId: "bank", amount: money(-1_150_000) },
  ];

  it("net worth drops by exactly the expense at purchase time", () => {
    const before = netWorth(ledger(accounts).balances());
    const after = netWorth(ledger(accounts, purchase).balances());
    expect(before).toBe(2_000_000n);
    expect(after).toBe(850_000n); // 2,000,000 − 1,150,000
  });

  it("paying the bill leaves net worth AND cash flow unchanged", () => {
    const afterPurchase = ledger(accounts, purchase);
    const afterPayment = ledger(accounts, purchase, payment);

    // Net worth is identical before and after the payment — only the balance
    // sheet composition moves (bank down, liability down).
    expect(netWorth(afterPurchase.balances())).toBe(850_000n);
    expect(netWorth(afterPayment.balances())).toBe(850_000n);

    // Cash flow (Income − Expense) is unchanged by the payment: the expense was
    // recognized at purchase; the payment has no income/expense leg.
    expect(cashFlow(afterPurchase.balances())).toBe(-1_150_000n);
    expect(cashFlow(afterPayment.balances())).toBe(-1_150_000n);

    // The card is fully paid off; the bank absorbed the outflow.
    expect(afterPayment.naturalOf("card")).toBe(0n);
    expect(afterPayment.naturalOf("bank")).toBe(850_000n);
  });
});

describe("golden §15.4 — transfers & the admin fee", () => {
  const accounts = {
    bca: { type: "ASSET" as AccountType, opening: 5_000_000 },
    gopay: { type: "ASSET" as AccountType, opening: 250_000 },
    fees: { type: "EXPENSE" as AccountType, opening: 0 },
  };

  it("a plain transfer leaves net worth and cash flow unchanged (§2.2d)", () => {
    const transfer: Leg[] = [
      { accountId: "gopay", amount: money(500_000) },
      { accountId: "bca", amount: money(-500_000) },
    ];
    const before = ledger(accounts);
    const after = ledger(accounts, transfer);
    expect(netWorth(before.balances())).toBe(5_250_000n);
    expect(netWorth(after.balances())).toBe(5_250_000n);
    expect(cashFlow(after.balances())).toBe(0n);
    expect(after.naturalOf("bca")).toBe(4_500_000n);
    expect(after.naturalOf("gopay")).toBe(750_000n);
  });

  it("a top-up WITH a fee drops net worth by exactly the fee (§2.2e2)", () => {
    const topUp: Leg[] = [
      { accountId: "gopay", amount: money(500_000) },
      { accountId: "fees", amount: money(1_000) },
      { accountId: "bca", amount: money(-501_000) },
    ];
    const after = ledger(accounts, topUp);
    // Net worth falls by the Rp1,000 fee only — the moved 500,000 is not lost.
    expect(netWorth(after.balances())).toBe(5_249_000n);
    expect(cashFlow(after.balances())).toBe(-1_000n);
  });
});
