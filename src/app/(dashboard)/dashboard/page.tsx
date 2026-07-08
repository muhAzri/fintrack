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
    <main>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Dashboard</h1>
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
