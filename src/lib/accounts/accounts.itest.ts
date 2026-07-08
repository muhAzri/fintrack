import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getNetWorth, postTransaction } from "@/lib/ledger";
import {
  accountHistory,
  createAccount,
  getAccount,
  listAccounts,
  moneyStorageView,
  seedChartOfAccounts,
  setAccountArchived,
} from "@/lib/accounts";

const email = `acct-${Date.now()}@example.com`;
let userId = "";

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email, passwordHash: "x" } });
  userId = user.id;
});

afterAll(async () => {
  if (userId) {
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.creditAccount.deleteMany({ where: { account: { userId } } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("seed chart of accounts (§4)", () => {
  it("seeds the default tree once, then is idempotent", async () => {
    const first = await seedChartOfAccounts(userId);
    expect(first.created).toBeGreaterThan(0);
    expect(first.skipped).toBe(false);

    const again = await seedChartOfAccounts(userId);
    expect(again).toEqual({ created: 0, skipped: true });

    const assets = await listAccounts(userId, { type: "ASSET" });
    expect(assets.some((a) => a.name === "Wallet Cash" && a.subtype === "CASH")).toBe(true);
    // No credit instruments are seeded — those need per-user billing params.
    const liabilities = await listAccounts(userId, { type: "LIABILITY" });
    expect(liabilities).toHaveLength(0);
  });
});

describe("account creation & billing params (§6.1, §3.5)", () => {
  it("creates a credit card with its credit_accounts row", async () => {
    const card = await createAccount(userId, {
      name: "BCA Card",
      type: "LIABILITY",
      subtype: "CREDIT_CARD",
      last4: "1234",
      credit: {
        instrument: "CREDIT_CARD",
        statementDay: 1,
        dueDay: 18,
        interestRateMonthly: "0.0175",
        minPaymentRate: "0.10",
        minPaymentFloor: 50_000n,
      },
    });
    const withParams = await getAccount(userId, card.id);
    expect(withParams.creditAccount?.instrument).toBe("CREDIT_CARD");
    expect(withParams.creditAccount?.statementDay).toBe(1);
    expect(withParams.last4).toBe("1234");
  });

  it("rejects a credit card without billing params (Zod, §3.5)", async () => {
    await expect(
      createAccount(userId, { name: "Bad Card", type: "LIABILITY", subtype: "CREDIT_CARD" }),
    ).rejects.toThrow();
  });

  it("rejects an incompatible subtype", async () => {
    await expect(
      createAccount(userId, { name: "Nope", type: "ASSET", subtype: "CREDIT_CARD" }),
    ).rejects.toThrow();
  });

  it("stores a liability opening balance in natural (negative) sign", async () => {
    const before = await getNetWorth(userId);
    await createAccount(userId, {
      name: "SPayLater",
      type: "LIABILITY",
      subtype: "PAYLATER",
      openingBalance: 5_000_000n, // entered as a magnitude
      credit: { instrument: "PAYLATER", statementDay: 25, dueOffsetDays: 5, interestRateMonthly: "0" },
    });
    // Net worth drops by the full opening debt.
    expect(await getNetWorth(userId)).toBe(before - 5_000_000n);
  });
});

describe("where is my money — aggregate liquidity (§6.1a, §15.4)", () => {
  it("computes Total Liquid = Σ of the six liquid accounts", async () => {
    // Set opening balances on the seeded accounts to the §15.4 scenario.
    const set = async (name: string, magnitude: bigint) => {
      const a = await prisma.account.findFirstOrThrow({ where: { userId, name } });
      await prisma.account.update({ where: { id: a.id }, data: { openingBalance: magnitude } });
    };
    await set("Bank BCA", 5_000_000n);
    await set("Bank Mandiri", 2_000_000n);
    await set("Bank Jago", 1_000_000n);
    await set("GoPay", 250_000n);
    await set("ShopeePay", 150_000n);
    await set("Wallet Cash", 600_000n);

    const view = await moneyStorageView(userId);
    expect(view.totalLiquid).toBe(9_000_000n); // §15.4
    expect(view.subtotalsBySubtype.BANK).toBe(8_000_000n);
    expect(view.subtotalsBySubtype.EWALLET).toBe(400_000n);
    expect(view.subtotalsBySubtype.CASH).toBe(600_000n);
  });

  it("a transfer moves balances but leaves Total Liquid unchanged (§15.4)", async () => {
    const bca = await prisma.account.findFirstOrThrow({ where: { userId, name: "Bank BCA" } });
    const gopay = await prisma.account.findFirstOrThrow({ where: { userId, name: "GoPay" } });
    await postTransaction({
      userId,
      date: new Date("2026-07-01"),
      description: "Top up GoPay",
      type: "TRANSFER",
      postings: [
        { accountId: gopay.id, amount: 500_000n },
        { accountId: bca.id, amount: -500_000n },
      ],
    });

    const view = await moneyStorageView(userId);
    expect(view.totalLiquid).toBe(9_000_000n); // unchanged
    const bcaRow = view.accounts.find((a) => a.id === bca.id);
    const gopayRow = view.accounts.find((a) => a.id === gopay.id);
    expect(bcaRow?.balance).toBe(4_500_000n);
    expect(gopayRow?.balance).toBe(750_000n);
  });

  it("per-account history shows a running balance (mutasi)", async () => {
    const bca = await prisma.account.findFirstOrThrow({ where: { userId, name: "Bank BCA" } });
    const history = await accountHistory(userId, bca.id);
    expect(history.at(-1)?.runningBalance).toBe(4_500_000n); // 5,000,000 − 500,000
  });
});

describe("archiving (§6.1a)", () => {
  it("hides an archived account from the active list but keeps its balance", async () => {
    const ovo = await prisma.account.findFirstOrThrow({ where: { userId, name: "OVO" } });
    await setAccountArchived(userId, ovo.id, true);
    const active = await listAccounts(userId);
    expect(active.some((a) => a.id === ovo.id)).toBe(false);
    const all = await listAccounts(userId, { includeArchived: true });
    expect(all.some((a) => a.id === ovo.id)).toBe(true);
  });
});

describe("tenant isolation (§6.0)", () => {
  it("cannot read another user's account", async () => {
    const other = await prisma.user.create({ data: { email: `other-${Date.now()}@example.com`, passwordHash: "x" } });
    const mine = await prisma.account.findFirstOrThrow({ where: { userId, name: "Bank BCA" } });
    await expect(getAccount(other.id, mine.id)).rejects.toThrow();
    await prisma.user.delete({ where: { id: other.id } });
  });
});
