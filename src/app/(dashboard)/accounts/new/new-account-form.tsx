"use client";

import { useActionState, useState } from "react";
import { createAccountAction, type AccountFormState } from "@/app/actions/accounts";
import { Field, FormError, FormSelect, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SUBTYPES: Record<"ASSET" | "LIABILITY", { value: string; label: string }[]> = {
  ASSET: [
    { value: "CASH", label: "Cash" },
    { value: "BANK", label: "Bank" },
    { value: "EWALLET", label: "E-wallet" },
    { value: "RECEIVABLE", label: "Receivable" },
    { value: "INVESTMENT", label: "Investment" },
    { value: "OTHER", label: "Other" },
  ],
  LIABILITY: [
    { value: "CREDIT_CARD", label: "Credit card" },
    { value: "PAYLATER", label: "Paylater" },
    { value: "LOAN", label: "Loan" },
    { value: "PERSONAL_DEBT", label: "Personal debt" },
    { value: "OTHER", label: "Other" },
  ],
};

export function NewAccountForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    createAccountAction,
    {},
  );
  const [type, setType] = useState<"ASSET" | "LIABILITY">("ASSET");
  const [subtype, setSubtype] = useState("CASH");
  const [dueMode, setDueMode] = useState<"day" | "offset">("day");
  const isCredit = subtype === "CREDIT_CARD" || subtype === "PAYLATER";

  return (
    <form action={action} className="space-y-4">
      <Field label="Name" name="name" placeholder="e.g. Bank BCA" required />

      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Type"
          name="type"
          value={type}
          onValueChange={(v) => {
            const t = v as "ASSET" | "LIABILITY";
            setType(t);
            setSubtype(SUBTYPES[t][0].value);
          }}
          options={[
            { value: "ASSET", label: "Asset" },
            { value: "LIABILITY", label: "Liability" },
          ]}
        />
        <FormSelect
          label="Subtype"
          name="subtype"
          value={subtype}
          onValueChange={setSubtype}
          options={SUBTYPES[type]}
        />
      </div>

      <Field
        label="Opening balance"
        name="openingBalance"
        inputMode="numeric"
        placeholder="0"
        hint="Amount you have now (assets) or owe now (liabilities). Whole rupiah."
      />
      <Field label="Group (optional)" name="group" placeholder="e.g. Daily, Savings" />

      {isCredit && (
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Billing parameters</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statement day (1–31)" name="statementDay" inputMode="numeric" required />
            <Field label="Last 4 digits" name="last4" inputMode="numeric" maxLength={4} />
          </div>

          <FormSelect
            label="Due date"
            name="dueMode"
            value={dueMode}
            onValueChange={(v) => setDueMode(v as "day" | "offset")}
            options={[
              { value: "day", label: "Fixed day of month" },
              { value: "offset", label: "Days after statement" },
            ]}
          />
          {dueMode === "day" ? (
            <Field label="Due day (1–31)" name="dueDay" inputMode="numeric" />
          ) : (
            <Field label="Days after statement" name="dueOffsetDays" inputMode="numeric" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Monthly interest"
              name="interestRateMonthly"
              placeholder="0.0175"
              hint="Ratio, e.g. 0.0175 = 1.75%/mo"
            />
            <Field label="Credit limit" name="creditLimit" inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min payment rate" name="minPaymentRate" placeholder="0.10" />
            <Field label="Min payment floor" name="minPaymentFloor" inputMode="numeric" />
          </div>
        </fieldset>
      )}

      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>Create account</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/accounts">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
