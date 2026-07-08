"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { recordTransactionAction, type TxFormState } from "@/app/actions/transactions";
import { Field, FormError, FormSelect, type SelectOption, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

const toOptions = (items: Option[]): SelectOption[] =>
  items.map((o) => ({ value: o.id, label: o.name }));
const first = (opts: SelectOption[]): string | undefined => opts[0]?.value;

export function NewTransactionForm({ data }: { data: TransactionFormData }) {
  const [state, action, pending] = useActionState<TxFormState, FormData>(
    recordTransactionAction,
    {},
  );
  const [mode, setMode] = useState<Mode>("expense");
  const [withFee, setWithFee] = useState(false);

  const assetOpts = toOptions(data.assets);
  const expenseOpts = toOptions(data.expenseAccounts);
  const incomeOpts = toOptions(data.incomeAccounts);
  const cardOpts: SelectOption[] = data.creditCards.map((c) => ({
    value: c.creditAccountId,
    label: c.name,
  }));
  const payFromOpts: SelectOption[] = [
    ...assetOpts,
    ...data.creditCards.map((c) => ({ value: c.accountId, label: `${c.name} (card)` })),
  ];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />

      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <Button
            key={m.value}
            type="button"
            size="sm"
            variant={mode === m.value ? "default" : "outline"}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      {mode === "expense" && (
        <>
          <FormSelect label="Category" name="expenseAccountId" options={expenseOpts} defaultValue={first(expenseOpts)} required />
          <FormSelect label="Paid from" name="sourceAccountId" options={payFromOpts} defaultValue={first(payFromOpts)} required />
        </>
      )}

      {mode === "income" && (
        <>
          <FormSelect label="Source" name="incomeAccountId" options={incomeOpts} defaultValue={first(incomeOpts)} required />
          <FormSelect label="Received into" name="assetAccountId" options={assetOpts} defaultValue={first(assetOpts)} required />
        </>
      )}

      {mode === "transfer" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="From" name="fromAccountId" options={assetOpts} defaultValue={first(assetOpts)} required />
            <FormSelect label="To" name="toAccountId" options={assetOpts} defaultValue={assetOpts[1]?.value ?? first(assetOpts)} required />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="withFee"
              type="checkbox"
              checked={withFee}
              onChange={(e) => setWithFee(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="withFee" className="font-normal">
              Add an admin/top-up fee
            </Label>
          </div>
          {withFee && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fee" name="fee" inputMode="numeric" placeholder="1000" />
              <FormSelect label="Fee category" name="feeAccountId" options={expenseOpts} defaultValue={first(expenseOpts)} />
            </div>
          )}
        </>
      )}

      {mode === "payment" && (
        <>
          <FormSelect label="Card / paylater" name="creditAccountId" options={cardOpts} defaultValue={first(cardOpts)} required />
          <FormSelect label="Pay from" name="sourceAccountId" options={assetOpts} defaultValue={first(assetOpts)} required />
        </>
      )}

      {mode === "installment" && (
        <>
          <FormSelect label="Card / paylater" name="creditAccountId" options={cardOpts} defaultValue={first(cardOpts)} required />
          <FormSelect label="Category" name="expenseAccountId" options={expenseOpts} defaultValue={first(expenseOpts)} required />
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
      {mode !== "payment" && <Field label="Description" name="description" placeholder="Optional" />}

      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>Record transaction</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/transactions">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
