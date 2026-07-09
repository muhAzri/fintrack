"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { registerAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form";

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, {});
  const t = useTranslations("auth");
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("registerTitle")}</h1>
      <Field label={t("name")} name="name" autoComplete="name" />
      <Field label={t("email")} name="email" type="email" autoComplete="email" required />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>{t("registerSubmit")}</SubmitButton>
      <p className="text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </form>
  );
}
