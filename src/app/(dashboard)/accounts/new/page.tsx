import { getTranslations } from "next-intl/server";
import { NewAccountForm } from "./new-account-form";

export default async function NewAccountPage() {
  const t = await getTranslations("accountForm");
  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <NewAccountForm />
    </main>
  );
}
