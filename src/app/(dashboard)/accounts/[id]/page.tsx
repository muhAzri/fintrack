import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAccountAction } from "@/app/actions/accounts";
import { requireUser } from "@/lib/auth/dal";
import { accountHistory, getAccount } from "@/lib/accounts";
import { formatIDR, money } from "@/lib/money";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const account = await getAccount(user.id, id).catch(() => null);
  if (!account) notFound();

  const history = await accountHistory(user.id, id);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/accounts" className="text-sm text-black/50 hover:underline dark:text-white/50">
            ← Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{account.name}</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {account.type}
            {account.subtype ? ` · ${account.subtype}` : ""}
          </p>
        </div>
        <form action={archiveAccountAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <input type="hidden" name="archived" value={(!account.isArchived).toString()} />
          <button
            type="submit"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            {account.isArchived ? "Unarchive" : "Archive"}
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          History (mutasi)
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                <tr className="border-b border-black/10 dark:border-white/15">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {history.map((row, i) => (
                  <tr key={`${row.transactionId}-${i}`}>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-black/60 dark:text-white/60">
                      {row.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2">{row.description}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatIDR(money(row.amount))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatIDR(money(row.runningBalance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
