"use client";

// Shared form primitives used across the app's forms.
import type { ComponentProps } from "react";

const controlClass =
  "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-black/40 dark:border-white/20 dark:focus:border-white/40";

export function Field({
  label,
  name,
  type = "text",
  hint,
  ...props
}: { label: string; name: string; hint?: string } & ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input name={name} type={type} className={controlClass} {...props} />
      {hint && <span className="mt-1 block text-xs text-black/50 dark:text-white/50">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  children,
  ...props
}: { label: string; name: string } & ComponentProps<"select">) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} className={controlClass} {...props}>
        {children}
      </select>
    </label>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>;
}
