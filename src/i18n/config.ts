// Locale configuration shared by the request config and the switcher.
export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "id";

export const LOCALE_COOKIE = "locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  id: "ID",
  en: "EN",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
