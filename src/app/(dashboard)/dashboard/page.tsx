import { requireUser } from "@/lib/auth/dal";
import { moneyStorageView } from "@/lib/accounts";
import { getCashFlow, getNetWorth } from "@/lib/ledger";
import { outstandingLiabilities } from "@/lib/billing";
import { civilDate, daysInMonth, jakartaCivilDate } from "@/lib/dates";
import { formatIDR, money } from "@/lib/money";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const total = totalAssets + totalLiabilities;
  const assetPct = total > 0n ? Number((totalAssets * 100n) / total) : 100;

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Net worth" value={formatIDR(money(netWorth))} />
        <StatCard label="Total liquid" value={formatIDR(money(storage.totalLiquid))} />
        <StatCard label="Outstanding debt" value={formatIDR(money(outstanding.total))} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">This month&apos;s cash flow</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Income" value={formatIDR(money(cashFlow.income))} />
          <StatCard label="Expense" value={formatIDR(money(cashFlow.expense))} />
          <StatCard
            label="Net"
            value={formatIDR(money(cashFlow.net))}
            accent={cashFlow.net >= 0n ? "positive" : "negative"}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets vs liabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-green-600/80" style={{ width: `${assetPct}%` }} />
            <div className="h-full bg-destructive/80" style={{ width: `${100 - assetPct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Assets{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatIDR(money(totalAssets))}
              </span>
            </span>
            <span>
              Liabilities{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatIDR(money(totalLiabilities))}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
