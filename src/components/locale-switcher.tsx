"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/app/actions/locale";
import { LOCALE_LABEL, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === active) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5 text-xs" aria-label="Language">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => switchTo(l)}
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors disabled:opacity-50",
            active === l
              ? "bg-secondary font-medium text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
