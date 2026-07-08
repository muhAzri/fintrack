import Link from "next/link";
import { reverseTransactionAction } from "@/app/actions/transactions";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { abs, formatIDR, money } from "@/lib/money";

const TYPE_LABEL: Record<string, string> = {
  EXPENSE: "Expense",
  INCOME: "Income",
  TRANSFER: "Transfer",
  CC_PAYMENT: "Payment",
  ADJUSTMENT: "Adjustment",
  INSTALLMENT_PURCHASE: "Installment",
  REFUND: "Refund",
};

export default async function TransactionsPage() {
  const user = await requireUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: {
      postings: { include: { account: { select: { name: true } } } },
      reversedBy: { select: { id: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <Link
          href="/transactions/new"
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          New transaction
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No transactions yet. Record your first one.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {transactions.map((t) => {
            const magnitude = t.postings.reduce(
              (max, p) => (abs(money(p.amount)) > max ? abs(money(p.amount)) : max),
              0n,
            );
            const isReversal = t.reversalOfId != null;
            const alreadyReversed = t.reversedBy.length > 0;
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {t.date.toISOString().slice(0, 10)} · {TYPE_LABEL[t.type] ?? t.type}
                    {isReversal && " · reversal"}
                    {alreadyReversed && " · reversed"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{formatIDR(money(magnitude))}</span>
                  {!isReversal && !alreadyReversed && (
                    <form action={reverseTransactionAction}>
                      <input type="hidden" name="transactionId" value={t.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Reverse
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
