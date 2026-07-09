import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { listAccounts, moneyStorageView } from "@/lib/accounts";
import { outstandingLiabilities } from "@/lib/billing";
import { formatIDR, money } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountsPage() {
  const user = await requireUser();
  const t = await getTranslations("accounts");
  const st = await getTranslations("accountSubtypeGroup");
  const sub = await getTranslations("accountSubtype");
  const [storage, outstanding, liabilities] = await Promise.all([
    moneyStorageView(user.id),
    outstandingLiabilities(user.id),
    listAccounts(user.id, { type: "LIABILITY" }),
  ]);

  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild size="sm">
          <Link href="/accounts/new">{t("new")}</Link>
        </Button>
      </div>

      {/* Where is my money (§6.1a) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("totalLiquidLabel")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-semibold tabular-nums">{formatIDR(money(storage.totalLiquid))}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {(Object.entries(storage.subtotalsBySubtype) as [string, bigint][]).map(
              ([subtype, total]) => (
                <span key={subtype}>
                  {st(subtype)}:{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatIDR(money(total))}
                  </span>
                </span>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <AccountList
        title={t("assets")}
        rows={storage.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          meta: a.subtype ? st(a.subtype) : "",
          amount: formatIDR(money(a.balance)),
        }))}
        empty={t("emptyAssets")}
      />

      <AccountList
        title={t("liabilities")}
        rows={liabilities.map((a) => {
          const out = outstanding.perAccount.find((o) => o.accountId === a.id);
          return {
            id: a.id,
            name: a.name,
            meta: a.subtype ? sub(a.subtype) : "",
            amount: formatIDR(money(out?.outstanding ?? 0n)),
          };
        })}
        empty={t("emptyLiabilities")}
      />
    </main>
  );
}

function AccountList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { id: string; name: string; meta: string; amount: string }[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/accounts/${r.id}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
            >
              <span>
                <span className="font-medium">{r.name}</span>
                {r.meta && <span className="ml-2 text-xs text-muted-foreground">{r.meta}</span>}
              </span>
              <span className="tabular-nums">{r.amount}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
