import { closeDueStatementsAction } from "@/app/actions/billing";
import { requireUser } from "@/lib/auth/dal";
import { dueTimeline, lockedVsRunning } from "@/lib/billing";
import { formatIDR, money } from "@/lib/money";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_LABEL: Record<string, string> = {
  STATEMENT_DUE: "Statement due",
  INSTALLMENT_DUE: "Installment due",
};

export default async function CalendarPage() {
  const user = await requireUser();
  const [timeline, split] = await Promise.all([
    dueTimeline(user.id, { horizons: [7, 14, 30] }),
    lockedVsRunning(user.id),
  ]);

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <form action={closeDueStatementsAction}>
          <Button type="submit" variant="outline" size="sm">
            Refresh statements
          </Button>
        </form>
      </div>

      {/* Cash-coverage per horizon (§5.6, §6.4) */}
      <section className="grid gap-4 sm:grid-cols-3">
        {timeline.horizons.map((h) => (
          <StatCard
            key={h.horizonDays}
            label={`Due within ${h.horizonDays} days`}
            value={formatIDR(money(h.dueTotal))}
          >
            <Badge
              variant={h.isCoveredByCash ? "secondary" : "destructive"}
              className="mt-2 font-normal"
            >
              {h.isCoveredByCash ? "Covered by cash" : "Not covered"}
            </Badge>
          </StatCard>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Locked bill (awaiting payment)" value={formatIDR(money(split.lockedBill))} />
        <StatCard label="Running spend (open cycle)" value={formatIDR(money(split.runningSpend))} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Upcoming (next 30 days)</h2>
          <span className="text-sm text-muted-foreground">
            Total liquid: {formatIDR(money(timeline.totalLiquid))}
          </span>
        </div>
        {timeline.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due in the next 30 days.</p>
        ) : (
          <Card className="py-0">
            <CardContent className="divide-y px-0">
              {timeline.events.map((e, i) => (
                <div
                  key={`${e.accountId}-${i}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                      {TYPE_LABEL[e.type] ?? e.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {e.date.toISOString().slice(0, 10)}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatIDR(money(e.amount))}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
