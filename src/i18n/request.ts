import { getRequestConfig } from "next-intl/server";

// Single-locale setup: Bahasa Indonesia. All non-user-authored UI text is
// externalized to messages/<locale>.json. Structured so more locales can be
// added later (a routed [locale] segment or a cookie-based switcher).
export const locale = "id";

export default getRequestConfig(async () => ({
  locale,
  messages: (await import(`../../messages/${locale}.json`)).default,
}));
