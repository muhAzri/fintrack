"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { recordTransactionAction, type TxFormState } from "@/app/actions/transactions";
import { Field, FormError, Select, SubmitButton } from "@/components/form";

interface Option {
  id: string;
  name: string;
}
interface CreditOption {
  accountId: string;
  creditAccountId: string;
  name: string;
}

export interface TransactionFormData {
  assets: Option[];
  expenseAccounts: Option[];
  incomeAccounts: Option[];
  creditCards: CreditOption[];
}

type Mode = "expense" | "income" | "transfer" | "payment" | "installment";

const MODES: { value: Mode; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "payment", label: "Bill payment" },
  { value: "installment", label: "Installment" },
];

function Options({ items }: { items: Option[] }) {
  return (
    <>
      {items.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </>
  );
}

export function NewTransactionForm({ data }: { data: TransactionFormData }) {
  const [state, action, pending] = useActionState<TxFormState, FormData>(
    recordTransactionAction,
    {},
  );
  const [mode, setMode] = useState<Mode>("expense");
  const [withFee, setWithFee] = useState(false);

  const payFrom: Option[] = [
    ...data.assets,
    ...data.creditCards.map((c) => ({ id: c.accountId, name: `${c.name} (card)` })),
  ];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />

      <div className="flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              mode === m.value
                ? "bg-foreground text-background"
                : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "expense" && (
        <>
          <Select label="Category" name="expenseAccountId" required>
            <Options items={data.expenseAccounts} />
          </Select>
          <Select label="Paid from" name="sourceAccountId" required>
            <Options items={payFrom} />
          </Select>
        </>
      )}

      {mode === "income" && (
        <>
          <Select label="Source" name="incomeAccountId" required>
            <Options items={data.incomeAccounts} />
          </Select>
          <Select label="Received into" name="assetAccountId" required>
            <Options items={data.assets} />
          </Select>
        </>
      )}

      {mode === "transfer" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select label="From" name="fromAccountId" required>
              <Options items={data.assets} />
            </Select>
            <Select label="To" name="toAccountId" required>
              <Options items={data.assets} />
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withFee} onChange={(e) => setWithFee(e.target.checked)} />
            Add an admin/top-up fee
          </label>
          {withFee && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fee" name="fee" inputMode="numeric" placeholder="1000" />
              <Select label="Fee category" name="feeAccountId">
                <Options items={data.expenseAccounts} />
              </Select>
            </div>
          )}
        </>
      )}

      {mode === "payment" && (
        <>
          <Select label="Card / paylater" name="creditAccountId" required>
            {data.creditCards.map((c) => (
              <option key={c.creditAccountId} value={c.creditAccountId}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Pay from" name="sourceAccountId" required>
            <Options items={data.assets} />
          </Select>
        </>
      )}

      {mode === "installment" && (
        <>
          <Select label="Card / paylater" name="creditAccountId" required>
            {data.creditCards.map((c) => (
              <option key={c.creditAccountId} value={c.creditAccountId}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Category" name="expenseAccountId" required>
            <Options items={data.expenseAccounts} />
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tenor (months)" name="tenorMonths" inputMode="numeric" placeholder="3" required />
            <Field label="Monthly interest" name="interestRateMonthly" placeholder="0" hint="0 for 0%" />
          </div>
        </>
      )}

      <Field
        label={mode === "installment" ? "Total principal" : "Amount"}
        name="amount"
        inputMode="numeric"
        placeholder="0"
        required
      />
      <Field label="Date" name="date" type="date" />
      {mode !== "payment" && (
        <Field label="Description" name="description" placeholder="Optional" />
      )}

      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>Record transaction</SubmitButton>
      <p className="text-sm text-black/60 dark:text-white/60">
        <Link href="/transactions" className="hover:underline">
          Cancel
        </Link>
      </p>
    </form>
  );
}
