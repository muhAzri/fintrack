"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type FormState } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "../form-ui";

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <Field label="Name (optional)" name="name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>Create account</SubmitButton>
      <p className="text-sm text-black/60 dark:text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="hover:underline">Log in</Link>
      </p>
    </form>
  );
}
