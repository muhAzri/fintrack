import { requireUser } from "@/lib/auth/dal";
import { listAccounts } from "@/lib/accounts";
import { NewTransactionForm, type TransactionFormData } from "./new-transaction-form";

export default async function NewTransactionPage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.id);

  const data: TransactionFormData = {
    assets: accounts.filter((a) => a.type === "ASSET").map((a) => ({ id: a.id, name: a.name })),
    expenseAccounts: accounts
      .filter((a) => a.type === "EXPENSE")
      .map((a) => ({ id: a.id, name: a.name })),
    incomeAccounts: accounts
      .filter((a) => a.type === "INCOME")
      .map((a) => ({ id: a.id, name: a.name })),
    creditCards: accounts
      .filter((a) => a.creditAccount)
      .map((a) => ({ accountId: a.id, creditAccountId: a.creditAccount!.id, name: a.name })),
  };

  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New transaction</h1>
      <NewTransactionForm data={data} />
    </main>
  );
}
