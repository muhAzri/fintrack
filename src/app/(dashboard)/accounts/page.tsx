import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { listAccounts, moneyStorageView } from "@/lib/accounts";
import { outstandingLiabilities } from "@/lib/billing";
import { formatIDR, money } from "@/lib/money";

const SUBTYPE_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK: "Banks",
  EWALLET: "E-wallets",
  RECEIVABLE: "Receivables",
  INVESTMENT: "Investments",
  OTHER: "Other",
};

export default async function AccountsPage() {
  const user = await requireUser();
  const [storage, outstanding, liabilities] = await Promise.all([
    moneyStorageView(user.id),
    outstandingLiabilities(user.id),
    listAccounts(user.id, { type: "LIABILITY" }),
  ]);

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <Link
          href="/accounts/new"
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          New account
        </Link>
      </div>

      {/* Where is my money (§6.1a) */}
      <section className="rounded-lg border border-black/10 p-5 dark:border-white/15">
        <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
          Total liquid (cash + banks + e-wallets)
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {formatIDR(money(storage.totalLiquid))}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-black/60 dark:text-white/60">
          {Object.entries(storage.subtotalsBySubtype).map(([subtype, total]) => (
            <span key={subtype}>
              {SUBTYPE_LABEL[subtype] ?? subtype}:{" "}
              <span className="font-medium tabular-nums text-black dark:text-white">
                {formatIDR(money(total ?? 0n))}
              </span>
            </span>
          ))}
        </div>
      </section>

      <AccountList
        title="Assets"
        rows={storage.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          meta: SUBTYPE_LABEL[a.subtype ?? "OTHER"] ?? a.subtype ?? "",
          amount: formatIDR(money(a.balance)),
        }))}
        empty="No asset accounts yet."
      />

      <AccountList
        title="Liabilities"
        rows={liabilities.map((a) => {
          const out = outstanding.perAccount.find((o) => o.accountId === a.id);
          return {
            id: a.id,
            name: a.name,
            meta: a.subtype ?? "",
            amount: formatIDR(money(out?.outstanding ?? 0n)),
          };
        })}
        empty="No credit cards or paylater accounts yet."
      />
    </main>
  );
}

function AccountList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { id: string; name: string; meta: string; amount: string }[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">{empty}</p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/accounts/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span>
                  <span className="font-medium">{r.name}</span>
                  {r.meta && (
                    <span className="ml-2 text-xs text-black/50 dark:text-white/50">{r.meta}</span>
                  )}
                </span>
                <span className="tabular-nums">{r.amount}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
