import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { moneyStorageView } from "@/lib/accounts";
import { getNetWorth } from "@/lib/ledger";
import { outstandingLiabilities } from "@/lib/billing";
import { formatIDR, money } from "@/lib/money";

export default async function DashboardPage() {
  const user = await requireUser();
  const [netWorth, storage, outstanding] = await Promise.all([
    getNetWorth(user.id),
    moneyStorageView(user.id),
    outstandingLiabilities(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6 sm:p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{user.name ?? user.email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Log out
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Tile label="Net worth" value={formatIDR(money(netWorth))} />
        <Tile label="Total liquid" value={formatIDR(money(storage.totalLiquid))} />
        <Tile label="Outstanding debt" value={formatIDR(money(outstanding.total))} />
      </section>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
