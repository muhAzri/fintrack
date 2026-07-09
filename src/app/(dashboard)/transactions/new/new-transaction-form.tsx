"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

const toOptions = (items: Option[]): SelectOption[] =>
  items.map((o) => ({ value: o.id, label: o.name }));
const first = (opts: SelectOption[]): string | undefined => opts[0]?.value;

export function NewTransactionForm({ data }: { data: TransactionFormData }) {
  const [state, action, pending] = useActionState<TxFormState, FormData>(
    recordTransactionAction,
    {},
  );
  const t = useTranslations("transactionForm");
  const tc = useTranslations("common");
  const [mode, setMode] = useState<Mode>("expense");
  const [withFee, setWithFee] = useState(false);

  const MODES: { value: Mode; label: string }[] = [
    { value: "expense", label: t("modeExpense") },
    { value: "income", label: t("modeIncome") },
    { value: "transfer", label: t("modeTransfer") },
    { value: "payment", label: t("modePayment") },
    { value: "installment", label: t("modeInstallment") },
  ];

  const assetOpts = toOptions(data.assets);
  const expenseOpts = toOptions(data.expenseAccounts);
  const incomeOpts = toOptions(data.incomeAccounts);
  const cardOpts: SelectOption[] = data.creditCards.map((c) => ({
    value: c.creditAccountId,
    label: c.name,
  }));
  const payFromOpts: SelectOption[] = [
    ...assetOpts,
    ...data.creditCards.map((c) => ({ value: c.accountId, label: `${c.name} ${t("cardSuffix")}` })),
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
          <FormSelect label={t("category")} name="expenseAccountId" options={expenseOpts} defaultValue={first(expenseOpts)} required />
          <FormSelect label={t("paidFrom")} name="sourceAccountId" options={payFromOpts} defaultValue={first(payFromOpts)} required />
        </>
      )}

      {mode === "income" && (
        <>
          <FormSelect label={t("source")} name="incomeAccountId" options={incomeOpts} defaultValue={first(incomeOpts)} required />
          <FormSelect label={t("receivedInto")} name="assetAccountId" options={assetOpts} defaultValue={first(assetOpts)} required />
        </>
      )}

      {mode === "transfer" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label={t("from")} name="fromAccountId" options={assetOpts} defaultValue={first(assetOpts)} required />
            <FormSelect label={t("to")} name="toAccountId" options={assetOpts} defaultValue={assetOpts[1]?.value ?? first(assetOpts)} required />
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
              {t("addFee")}
            </Label>
          </div>
          {withFee && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("fee")} name="fee" inputMode="numeric" placeholder="1000" />
              <FormSelect label={t("feeCategory")} name="feeAccountId" options={expenseOpts} defaultValue={first(expenseOpts)} />
            </div>
          )}
        </>
      )}

      {mode === "payment" && (
        <>
          <FormSelect label={t("card")} name="creditAccountId" options={cardOpts} defaultValue={first(cardOpts)} required />
          <FormSelect label={t("payFrom")} name="sourceAccountId" options={assetOpts} defaultValue={first(assetOpts)} required />
        </>
      )}

      {mode === "installment" && (
        <>
          <FormSelect label={t("card")} name="creditAccountId" options={cardOpts} defaultValue={first(cardOpts)} required />
          <FormSelect label={t("category")} name="expenseAccountId" options={expenseOpts} defaultValue={first(expenseOpts)} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("tenor")} name="tenorMonths" inputMode="numeric" placeholder="3" required />
            <Field label={t("interest")} name="interestRateMonthly" placeholder="0" hint={t("interestHint")} />
          </div>
        </>
      )}

      <Field
        label={mode === "installment" ? t("totalPrincipal") : t("amount")}
        name="amount"
        inputMode="numeric"
        placeholder="0"
        required
      />
      <Field label={t("date")} name="date" type="date" />
      {mode !== "payment" && (
        <Field label={t("description")} name="description" placeholder={t("descriptionPlaceholder")} />
      )}

      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/transactions">{tc("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
