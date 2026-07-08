import Link from "next/link";
import { reverseTransactionAction } from "@/app/actions/transactions";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { abs, formatIDR, money } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      postings: { select: { amount: true } },
      reversedBy: { select: { id: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <Button asChild size="sm">
          <Link href="/transactions/new">New transaction</Link>
        </Button>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transactions yet. Record your first one.
        </p>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {transactions.map((t) => {
            const magnitude = t.postings.reduce(
              (max, p) => (abs(money(p.amount)) > max ? abs(money(p.amount)) : max),
              0n,
            );
            const isReversal = t.reversalOfId != null;
            const alreadyReversed = t.reversedBy.length > 0;
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{t.date.toISOString().slice(0, 10)}</span>
                    <Badge variant="secondary" className="font-normal">
                      {TYPE_LABEL[t.type] ?? t.type}
                    </Badge>
                    {isReversal && <span>reversal</span>}
                    {alreadyReversed && <span>reversed</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{formatIDR(money(magnitude))}</span>
                  {!isReversal && !alreadyReversed && (
                    <form action={reverseTransactionAction}>
                      <input type="hidden" name="transactionId" value={t.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Reverse
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
