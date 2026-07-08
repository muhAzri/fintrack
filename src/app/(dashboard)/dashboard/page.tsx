import { requireUser } from "@/lib/auth/dal";
import { moneyStorageView } from "@/lib/accounts";
import { getCashFlow, getNetWorth } from "@/lib/ledger";
import { outstandingLiabilities } from "@/lib/billing";
import { civilDate, daysInMonth, jakartaCivilDate } from "@/lib/dates";
import { formatIDR, money } from "@/lib/money";

export default async function DashboardPage() {
  const user = await requireUser();

  const now = jakartaCivilDate(new Date());
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const from = civilDate(year, month, 1);
  const to = civilDate(year, month, daysInMonth(year, month));

  const [netWorth, storage, outstanding, cashFlow] = await Promise.all([
    getNetWorth(user.id),
    moneyStorageView(user.id),
    outstandingLiabilities(user.id),
    getCashFlow(user.id, from, to),
  ]);

  const totalAssets = storage.accounts.reduce((sum, a) => sum + a.balance, 0n);
  const totalLiabilities = outstanding.total;

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <Tile label="Net worth" value={formatIDR(money(netWorth))} />
        <Tile label="Total liquid" value={formatIDR(money(storage.totalLiquid))} />
        <Tile label="Outstanding debt" value={formatIDR(money(outstanding.total))} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          This month&apos;s cash flow
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="Income" value={formatIDR(money(cashFlow.income))} />
          <Tile label="Expense" value={formatIDR(money(cashFlow.expense))} />
          <Tile
            label="Net"
            value={formatIDR(money(cashFlow.net))}
            accent={cashFlow.net >= 0n ? "positive" : "negative"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          Assets vs liabilities
        </h2>
        <CompositionBar assets={totalAssets} liabilities={totalLiabilities} />
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-black/60 dark:text-white/60">
            Assets <span className="font-medium tabular-nums text-black dark:text-white">{formatIDR(money(totalAssets))}</span>
          </span>
          <span className="text-black/60 dark:text-white/60">
            Liabilities <span className="font-medium tabular-nums text-black dark:text-white">{formatIDR(money(totalLiabilities))}</span>
          </span>
        </div>
      </section>
    </main>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  const accentClass =
    accent === "positive"
      ? "text-green-700 dark:text-green-400"
      : accent === "negative"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}

function CompositionBar({ assets, liabilities }: { assets: bigint; liabilities: bigint }) {
  const total = assets + liabilities;
  const assetPct = total > 0n ? Number((assets * 100n) / total) : 0;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div className="h-full bg-green-600/80" style={{ width: `${assetPct}%` }} />
      <div className="h-full bg-red-500/80" style={{ width: `${100 - assetPct}%` }} />
    </div>
  );
}
