// Account management service (docs/REQUIREMENTS §6.1, §6.1a, §3.1, §3.5).
// Create / edit / archive accounts and their billing parameters, all scoped to
// the acting user (§13.2). Balances are never stored here — they are derived by
// the ledger/aggregate layers (P6).
import type { Account } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAccountSchema, type CreateAccountInput, updateAccountSchema, type UpdateAccountInput } from "./schema";
import { toNaturalSign } from "./subtype";

export * from "./subtype";
export * from "./schema";
export * from "./seed";
export * from "./aggregate";

/// Create an account (§6.1). A CREDIT_CARD/PAYLATER account is created together
/// with its credit_accounts row in one transaction (§3.1 one-to-one). Opening
/// balance is entered as a magnitude and stored in natural sign (§3.1).
export async function createAccount(userId: string, input: CreateAccountInput): Promise<Account> {
  const data = createAccountSchema.parse(input);
  const openingBalance = toNaturalSign(data.type, data.openingBalance);

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        subtype: data.subtype ?? null,
        openingBalance,
        openingDate: data.openingDate ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        group: data.group ?? null,
        last4: data.last4 ?? null,
      },
    });

    if (data.credit) {
      const c = data.credit;
      await tx.creditAccount.create({
        data: {
          accountId: account.id,
          instrument: c.instrument,
          creditLimit: c.creditLimit ?? null,
          statementDay: c.statementDay,
          dueDay: c.dueDay ?? null,
          dueOffsetDays: c.dueOffsetDays ?? null,
          gracePeriodDays: c.gracePeriodDays ?? null,
          interestRateMonthly: c.interestRateMonthly,
          minPaymentRate: c.minPaymentRate ?? null,
          minPaymentFloor: c.minPaymentFloor ?? null,
          lateFee: c.lateFee ?? null,
        },
      });
    }

    return account;
  });
}

async function ownedAccountOrThrow(userId: string, accountId: string): Promise<{ id: string }> {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId }, select: { id: true } });
  if (!account) throw new Error("account not found for this user (§6.0)");
  return account;
}

/// Edit presentation fields (§6.1). Type/subtype are not editable here.
export async function updateAccount(
  userId: string,
  accountId: string,
  patch: UpdateAccountInput,
): Promise<Account> {
  const data = updateAccountSchema.parse(patch);
  await ownedAccountOrThrow(userId, accountId);
  return prisma.account.update({ where: { id: accountId }, data });
}

/// Archive / unarchive an account (§6.1a). Historical postings still count
/// toward past balances and net worth; the account is hidden from active
/// pickers.
export async function setAccountArchived(
  userId: string,
  accountId: string,
  archived: boolean,
): Promise<Account> {
  await ownedAccountOrThrow(userId, accountId);
  return prisma.account.update({ where: { id: accountId }, data: { isArchived: archived } });
}

export interface ListAccountsOptions {
  includeArchived?: boolean;
  type?: Account["type"];
}

/// List a user's accounts (§6.1a), active-only by default.
export function listAccounts(userId: string, options: ListAccountsOptions = {}) {
  return prisma.account.findMany({
    where: {
      userId,
      ...(options.includeArchived ? {} : { isArchived: false }),
      ...(options.type ? { type: options.type } : {}),
    },
    include: { creditAccount: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

/// Fetch one owned account with its billing parameters (§6.1).
export async function getAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    include: { creditAccount: true },
  });
  if (!account) throw new Error("account not found for this user (§6.0)");
  return account;
}
