"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { recordTransactionAction, type TxFormState } from "@/app/actions/transactions";
import { Field, FormError, FormMessage, FormSelect, type SelectOption } from "@/components/form";
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

type Mode = "expense" | "income" | "transfer" | "payment" | "installment" | "existing";

// Text/number inputs cleared after "save & add another". Selects are NOT here —
// they are controlled state and deliberately persist, so repeat entries keep the
// same account/card/category.
const CLEARABLE = [
  "amount",
  "tenorMonths",
  "monthlyAmount",
  "interestRateMonthly",
  "fee",
  "description",
] as const;

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
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<Mode>("expense");
  const [withFee, setWithFee] = useState(false);
  const [knowMonthly, setKnowMonthly] = useState(true);
  const [saved, setSaved] = useState(false);

  const MODES: { value: Mode; label: string }[] = [
    { value: "expense", label: t("modeExpense") },
    { value: "income", label: t("modeIncome") },
    { value: "transfer", label: t("modeTransfer") },
    { value: "payment", label: t("modePayment") },
    { value: "installment", label: t("modeInstallment") },
    { value: "existing", label: t("modeExisting") },
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

  // Selects are controlled so their value survives a "save & add another" reset.
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const d: Record<string, string | undefined> = {
      expenseAccountId: first(expenseOpts),
      sourceAccountId: first(payFromOpts),
      incomeAccountId: first(incomeOpts),
      assetAccountId: first(assetOpts),
      fromAccountId: first(assetOpts),
      toAccountId: assetOpts[1]?.value ?? first(assetOpts),
      feeAccountId: first(expenseOpts),
      creditAccountId: first(cardOpts),
    };
    return Object.fromEntries(Object.entries(d).filter(([, v]) => v)) as Record<string, string>;
  });
  const bind = (name: string) => ({
    value: sel[name],
    onValueChange: (v: string) => setSel((s) => ({ ...s, [name]: v })),
  });

  // After a successful "save & add another": clear the amount-ish fields, keep
  // selections, flash a confirmation, and drop focus back on the amount field so
  // the next entry is one tap away.
  useEffect(() => {
    if (!state.ok) return;
    const form = formRef.current;
    if (!form) return;
    for (const name of CLEARABLE) {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement) el.value = "";
    }
    setSaved(true);
    const amount = form.elements.namedItem("amount");
    if (amount instanceof HTMLInputElement) amount.focus();
  }, [state]);

  return (
    <form ref={formRef} action={action} onChange={() => setSaved(false)} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />

      {/* Thumb-friendly, horizontally scrollable mode switch — never reflows the
          form below when you change it. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MODES.map((m) => (
          <Button
            key={m.value}
            type="button"
            variant={mode === m.value ? "default" : "outline"}
            onClick={() => setMode(m.value)}
            className="h-9 shrink-0"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {mode === "expense" && (
        <>
          <FormSelect label={t("category")} name="expenseAccountId" options={expenseOpts} {...bind("expenseAccountId")} required />
          <FormSelect label={t("paidFrom")} name="sourceAccountId" options={payFromOpts} {...bind("sourceAccountId")} required />
        </>
      )}

      {mode === "income" && (
        <>
          <FormSelect label={t("source")} name="incomeAccountId" options={incomeOpts} {...bind("incomeAccountId")} required />
          <FormSelect label={t("receivedInto")} name="assetAccountId" options={assetOpts} {...bind("assetAccountId")} required />
        </>
      )}

      {mode === "transfer" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label={t("from")} name="fromAccountId" options={assetOpts} {...bind("fromAccountId")} required />
            <FormSelect label={t("to")} name="toAccountId" options={assetOpts} {...bind("toAccountId")} required />
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
              <FormSelect label={t("feeCategory")} name="feeAccountId" options={expenseOpts} {...bind("feeAccountId")} />
            </div>
          )}
        </>
      )}

      {mode === "payment" && (
        <>
          <FormSelect label={t("card")} name="creditAccountId" options={cardOpts} {...bind("creditAccountId")} required />
          <FormSelect label={t("payFrom")} name="sourceAccountId" options={assetOpts} {...bind("sourceAccountId")} required />
        </>
      )}

      {mode === "installment" && (
        <>
          <FormSelect label={t("card")} name="creditAccountId" options={cardOpts} {...bind("creditAccountId")} required />
          <FormSelect label={t("category")} name="expenseAccountId" options={expenseOpts} {...bind("expenseAccountId")} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("tenor")} name="tenorMonths" inputMode="numeric" placeholder="3" required />
            <Field label={t("interest")} name="interestRateMonthly" inputMode="decimal" placeholder="0" hint={t("interestHint")} />
          </div>
        </>
      )}

      {mode === "existing" && (
        <>
          <FormSelect label={t("card")} name="creditAccountId" options={cardOpts} {...bind("creditAccountId")} required />
          <Field label={t("remainingTenor")} name="tenorMonths" inputMode="numeric" placeholder="14" required />
          <div className="flex items-center gap-2">
            <input
              id="knowMonthly"
              type="checkbox"
              checked={knowMonthly}
              onChange={(e) => setKnowMonthly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="knowMonthly" className="font-normal">
              {t("knowMonthly")}
            </Label>
          </div>
          {knowMonthly ? (
            <Field label={t("monthlyAmount")} name="monthlyAmount" inputMode="numeric" placeholder="1500000" hint={t("monthlyAmountHint")} required />
          ) : (
            <Field label={t("interest")} name="interestRateMonthly" inputMode="decimal" placeholder="0" hint={t("existingInterestHint")} />
          )}
        </>
      )}

      <Field
        label={
          mode === "installment"
            ? t("totalPrincipal")
            : mode === "existing"
              ? t("remainingPrincipal")
              : t("amount")
        }
        name="amount"
        inputMode="numeric"
        enterKeyHint="done"
        placeholder="0"
        className="h-10 text-base font-medium"
        required
      />
      <Field label={t("date")} name="date" type="date" />
      {mode !== "payment" && (
        <Field label={t("description")} name="description" placeholder={t("descriptionPlaceholder")} />
      )}

      <FormError>{state.error}</FormError>
      {saved && <FormMessage>{t("saved")}</FormMessage>}

      {/* Primary path is repeat entry; "Save" (redirect) and "Cancel" are
          secondary. Full-width stacked on mobile, inline on larger screens. */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
        <Button type="submit" name="stay" value="1" disabled={pending} className="h-10 w-full sm:h-8 sm:w-auto sm:flex-1">
          {pending && <Loader2 className="animate-spin" />}
          {t("saveAndAnother")}
        </Button>
        <Button type="submit" variant="outline" disabled={pending} className="h-10 w-full sm:h-8 sm:w-auto">
          {t("submit")}
        </Button>
        <Button type="button" variant="ghost" asChild className="h-10 w-full sm:h-8 sm:w-auto">
          <Link href="/transactions">{tc("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
