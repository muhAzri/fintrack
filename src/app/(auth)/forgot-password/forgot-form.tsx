"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { requestResetAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormMessage, SubmitButton } from "@/components/form";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestResetAction, {});
  const t = useTranslations("auth");
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("forgotTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("forgotDesc")}</p>
      <Field label={t("email")} name="email" type="email" autoComplete="email" required />
      <FormError>{state.error}</FormError>
      <FormMessage>{state.message}</FormMessage>
      <SubmitButton pending={pending}>{t("forgotSubmit")}</SubmitButton>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
