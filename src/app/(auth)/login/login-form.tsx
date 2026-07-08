"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormMessage, SubmitButton } from "@/components/form";

export function LoginForm({ justReset }: { justReset?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      {justReset && <FormMessage>Password updated — log in with your new password.</FormMessage>}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/register" className="hover:underline">Create account</Link>
        <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
      </div>
    </form>
  );
}
