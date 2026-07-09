"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { loginAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormMessage, SubmitButton } from "@/components/form";

export function LoginForm({ justReset }: { justReset?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const t = useTranslations("auth");
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("loginTitle")}</h1>
      {justReset && <FormMessage>{t("passwordUpdated")}</FormMessage>}
      <Field label={t("email")} name="email" type="email" autoComplete="email" required />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>{t("loginSubmit")}</SubmitButton>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/register" className="hover:underline">
          {t("createAccountLink")}
        </Link>
        <Link href="/forgot-password" className="hover:underline">
          {t("forgotLink")}
        </Link>
      </div>
    </form>
  );
}
