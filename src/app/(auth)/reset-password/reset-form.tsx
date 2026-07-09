"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { resetAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetAction, {});
  const t = useTranslations("auth");
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("resetTitle")}</h1>
      <input type="hidden" name="token" value={token} />
      {!token && <FormError>{t("resetMissingToken")}</FormError>}
      <Field
        label={t("newPassword")}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>{t("resetSubmit")}</SubmitButton>
      <p className="text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:underline">
          {t("requestNewLink")}
        </Link>
      </p>
    </form>
  );
}
