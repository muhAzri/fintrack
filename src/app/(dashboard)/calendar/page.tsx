import { closeDueStatementsAction } from "@/app/actions/billing";
import { requireUser } from "@/lib/auth/dal";
import { dueTimeline, lockedVsRunning } from "@/lib/billing";
import { formatIDR, money } from "@/lib/money";

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
          <button
            type="submit"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Refresh statements
          </button>
        </form>
      </div>

      {/* Cash-coverage per horizon (§5.6, §6.4) */}
      <section className="grid gap-4 sm:grid-cols-3">
        {timeline.horizons.map((h) => (
          <div key={h.horizonDays} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
              Due within {h.horizonDays} days
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatIDR(money(h.dueTotal))}</p>
            <p
              className={`mt-1 text-sm font-medium ${
                h.isCoveredByCash
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {h.isCoveredByCash ? "Covered by cash" : "Not covered"}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
            Locked bill (cut, awaiting payment)
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatIDR(money(split.lockedBill))}
          </p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
            Running spend (open cycle)
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatIDR(money(split.runningSpend))}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
            Upcoming (next 30 days)
          </h2>
          <span className="text-sm text-black/50 dark:text-white/50">
            Total liquid: {formatIDR(money(timeline.totalLiquid))}
          </span>
        </div>
        {timeline.events.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing due in the next 30 days.</p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
            {timeline.events.map((e, i) => (
              <li key={`${e.accountId}-${i}`} className="flex items-center justify-between px-4 py-3">
                <span>
                  <span className="font-medium">{TYPE_LABEL[e.type] ?? e.type}</span>
                  <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                    {e.date.toISOString().slice(0, 10)}
                  </span>
                </span>
                <span className="tabular-nums">{formatIDR(money(e.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
