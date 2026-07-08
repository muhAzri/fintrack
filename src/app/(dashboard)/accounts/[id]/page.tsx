import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAccountAction } from "@/app/actions/accounts";
import { requireUser } from "@/lib/auth/dal";
import { accountHistory, getAccount } from "@/lib/accounts";
import { formatIDR, money } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const account = await getAccount(user.id, id).catch(() => null);
  if (!account) notFound();

  const history = await accountHistory(user.id, id);

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/accounts" className="text-sm text-muted-foreground hover:underline">
            ← Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{account.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">{account.type}</Badge>
            {account.subtype && <Badge variant="outline">{account.subtype}</Badge>}
            {account.isArchived && <Badge variant="outline">Archived</Badge>}
          </div>
        </div>
        <form action={archiveAccountAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <input type="hidden" name="archived" value={(!account.isArchived).toString()} />
          <Button type="submit" variant="outline" size="sm">
            {account.isArchived ? "Unarchive" : "Archive"}
          </Button>
        </form>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">History (mutasi)</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row, i) => (
                  <TableRow key={`${row.transactionId}-${i}`}>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {row.date.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIDR(money(row.amount))}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIDR(money(row.runningBalance))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
