import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { reverseTransactionAction } from "@/app/actions/transactions";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { abs, formatIDR, money } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TransactionsPage() {
  const user = await requireUser();
  const t = await getTranslations("transactions");
  const tt = await getTranslations("transactionType");
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild size="sm">
          <Link href="/transactions/new">{t("new")}</Link>
        </Button>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {transactions.map((tx) => {
            const magnitude = tx.postings.reduce(
              (max, p) => (abs(money(p.amount)) > max ? abs(money(p.amount)) : max),
              0n,
            );
            const isReversal = tx.reversalOfId != null;
            const alreadyReversed = tx.reversedBy.length > 0;
            return (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{tx.description}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{tx.date.toISOString().slice(0, 10)}</span>
                    <Badge variant="secondary" className="font-normal">
                      {tt(tx.type)}
                    </Badge>
                    {isReversal && <span>{t("reversal")}</span>}
                    {alreadyReversed && <span>{t("reversed")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{formatIDR(money(magnitude))}</span>
                  {!isReversal && !alreadyReversed && (
                    <form action={reverseTransactionAction}>
                      <input type="hidden" name="transactionId" value={tx.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {t("reverse")}
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
