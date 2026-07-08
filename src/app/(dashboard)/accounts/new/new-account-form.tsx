"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createAccountAction, type AccountFormState } from "@/app/actions/accounts";
import { Field, FormError, Select, SubmitButton } from "@/components/form";

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
        <Select
          label="Type"
          name="type"
          value={type}
          onChange={(e) => {
            const t = e.target.value as "ASSET" | "LIABILITY";
            setType(t);
            setSubtype(SUBTYPES[t][0].value);
          }}
        >
          <option value="ASSET">Asset</option>
          <option value="LIABILITY">Liability</option>
        </Select>
        <Select
          label="Subtype"
          name="subtype"
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
        >
          {SUBTYPES[type].map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
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
        <fieldset className="space-y-4 rounded-md border border-black/10 p-4 dark:border-white/15">
          <legend className="px-1 text-sm font-medium">Billing parameters</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statement day (1–31)" name="statementDay" inputMode="numeric" required />
            <Field label="Last 4 digits" name="last4" inputMode="numeric" maxLength={4} />
          </div>

          <Select
            label="Due date"
            name="dueMode"
            value={dueMode}
            onChange={(e) => setDueMode(e.target.value as "day" | "offset")}
          >
            <option value="day">Fixed day of month</option>
            <option value="offset">Days after statement</option>
          </Select>
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
      <SubmitButton pending={pending}>Create account</SubmitButton>
      <p className="text-sm text-black/60 dark:text-white/60">
        <Link href="/accounts" className="hover:underline">
          Cancel
        </Link>
      </p>
    </form>
  );
}
