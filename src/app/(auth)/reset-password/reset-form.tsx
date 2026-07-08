"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "../form-ui";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <input type="hidden" name="token" value={token} />
      {!token && (
        <FormError>This reset link is missing its token. Request a new one.</FormError>
      )}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>Update password</SubmitButton>
      <p className="text-sm text-black/60 dark:text-white/60">
        <Link href="/forgot-password" className="hover:underline">Request a new link</Link>
      </p>
    </form>
  );
}
