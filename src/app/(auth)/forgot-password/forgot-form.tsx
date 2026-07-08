"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormMessage, SubmitButton } from "@/components/form";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestResetAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="text-sm text-muted-foreground">
        Enter your email and we&apos;ll send a reset link if an account exists.
      </p>
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <FormError>{state.error}</FormError>
      <FormMessage>{state.message}</FormMessage>
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">Back to log in</Link>
      </p>
    </form>
  );
}
