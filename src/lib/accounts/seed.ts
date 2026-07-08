// Default chart of accounts created at onboarding (docs/REQUIREMENTS §4). The
// tree is fully editable afterwards. Per the §13.2 decision it is scoped to the
// user. Credit cards / paylater are NOT seeded — each needs user-specific
// billing parameters (§3.5) and is added explicitly. Categories (§3.2) are an
// optional tag layer and are intentionally not seeded in the MVP; EXPENSE/INCOME
// accounts carry the primary classification (§2.2 journal entries).
import type { AccountSubtype, AccountType } from "@prisma/client";
import { prisma } from "@/lib/db";

interface SeedAccount {
  name: string;
  type: AccountType;
  subtype?: AccountSubtype;
}

/// The §4 default tree, minus user-specific credit instruments.
export const DEFAULT_CHART_OF_ACCOUNTS: readonly SeedAccount[] = [
  // ASSET — "money storage" (§6.1a)
  { name: "Wallet Cash", type: "ASSET", subtype: "CASH" },
  { name: "Bank BCA", type: "ASSET", subtype: "BANK" },
  { name: "Bank Mandiri", type: "ASSET", subtype: "BANK" },
  { name: "Bank Jago", type: "ASSET", subtype: "BANK" },
  { name: "GoPay", type: "ASSET", subtype: "EWALLET" },
  { name: "OVO", type: "ASSET", subtype: "EWALLET" },
  { name: "Dana", type: "ASSET", subtype: "EWALLET" },
  { name: "ShopeePay", type: "ASSET", subtype: "EWALLET" },
  { name: "Receivables", type: "ASSET", subtype: "RECEIVABLE" },

  // INCOME
  { name: "Salary", type: "INCOME" },
  { name: "Bonus/THR", type: "INCOME" },
  { name: "Freelance", type: "INCOME" },
  { name: "Interest", type: "INCOME" },
  { name: "Dividends", type: "INCOME" },
  { name: "Capital Gains", type: "INCOME" },

  // EXPENSE
  { name: "Food", type: "EXPENSE" },
  { name: "Transport", type: "EXPENSE" },
  { name: "Shopping", type: "EXPENSE" },
  { name: "Bills/Utilities", type: "EXPENSE" },
  { name: "Entertainment", type: "EXPENSE" },
  { name: "Health", type: "EXPENSE" },
  { name: "Card Interest & Fees", type: "EXPENSE" },
  { name: "Admin & Transfer Fees", type: "EXPENSE" },
  { name: "Miscellaneous", type: "EXPENSE" },

  // EQUITY
  { name: "Opening Balance", type: "EQUITY" },
];

export interface SeedResult {
  created: number;
  skipped: boolean;
}

/// Seed the default chart of accounts for a user (§4). Idempotent at the
/// onboarding level: if the user already has any account, it does nothing.
export async function seedChartOfAccounts(userId: string): Promise<SeedResult> {
  const existing = await prisma.account.count({ where: { userId } });
  if (existing > 0) return { created: 0, skipped: true };

  const result = await prisma.account.createMany({
    data: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
      userId,
      name: a.name,
      type: a.type,
      subtype: a.subtype ?? null,
    })),
  });
  return { created: result.count, skipped: false };
}
