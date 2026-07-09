"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createAccountAction, type AccountFormState } from "@/app/actions/accounts";
import { Field, FormError, FormSelect, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";

const SUBTYPE_VALUES: Record<"ASSET" | "LIABILITY", string[]> = {
  ASSET: ["CASH", "BANK", "EWALLET", "RECEIVABLE", "INVESTMENT", "OTHER"],
  LIABILITY: ["CREDIT_CARD", "PAYLATER", "LOAN", "PERSONAL_DEBT", "OTHER"],
};

export function NewAccountForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    createAccountAction,
    {},
  );
  const t = useTranslations("accountForm");
  const st = useTranslations("accountSubtype");
  const tc = useTranslations("common");
  const [type, setType] = useState<"ASSET" | "LIABILITY">("ASSET");
  const [subtype, setSubtype] = useState("CASH");
  const [dueMode, setDueMode] = useState<"day" | "offset">("day");
  const isCredit = subtype === "CREDIT_CARD" || subtype === "PAYLATER";

  const subtypeOptions = SUBTYPE_VALUES[type].map((v) => ({ value: v, label: st(v) }));

  return (
    <form action={action} className="space-y-4">
      <Field label={t("name")} name="name" placeholder={t("namePlaceholder")} required />

      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label={t("type")}
          name="type"
          value={type}
          onValueChange={(v) => {
            const nt = v as "ASSET" | "LIABILITY";
            setType(nt);
            setSubtype(SUBTYPE_VALUES[nt][0]);
          }}
          options={[
            { value: "ASSET", label: t("typeAsset") },
            { value: "LIABILITY", label: t("typeLiability") },
          ]}
        />
        <FormSelect
          label={t("subtype")}
          name="subtype"
          value={subtype}
          onValueChange={setSubtype}
          options={subtypeOptions}
        />
      </div>

      <Field
        label={t("openingBalance")}
        name="openingBalance"
        inputMode="numeric"
        placeholder="0"
        hint={t("openingHint")}
      />
      <Field label={t("group")} name="group" placeholder={t("groupPlaceholder")} />

      {isCredit && (
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">{t("billing")}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("statementDay")} name="statementDay" inputMode="numeric" required />
            <Field label={t("last4")} name="last4" inputMode="numeric" maxLength={4} />
          </div>

          <FormSelect
            label={t("dueDate")}
            name="dueMode"
            value={dueMode}
            onValueChange={(v) => setDueMode(v as "day" | "offset")}
            options={[
              { value: "day", label: t("dueFixed") },
              { value: "offset", label: t("dueOffset") },
            ]}
          />
          {dueMode === "day" ? (
            <Field label={t("dueDay")} name="dueDay" inputMode="numeric" />
          ) : (
            <Field label={t("dueOffsetDays")} name="dueOffsetDays" inputMode="numeric" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("interest")}
              name="interestRateMonthly"
              placeholder="0.0175"
              hint={t("interestHint")}
            />
            <Field label={t("creditLimit")} name="creditLimit" inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("minRate")} name="minPaymentRate" placeholder="0.10" />
            <Field label={t("minFloor")} name="minPaymentFloor" inputMode="numeric" />
          </div>
        </fieldset>
      )}

      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{t("submit")}</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/accounts">{tc("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
