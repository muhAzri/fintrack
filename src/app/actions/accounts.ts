"use server";

// Account management server actions (docs/REQUIREMENTS §6.1, §6.1a). Each one
// resolves the user first (§6.0) so every write is tenant-scoped.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createAccount, setAccountArchived, type CreateAccountInput } from "@/lib/accounts";
import { parseIDR } from "@/lib/money";

export interface AccountFormState {
  error?: string;
}

function toBigintOrNull(value: FormDataEntryValue | null): bigint | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return null;
  return parseIDR(s);
}

function toIntOrNull(value: FormDataEntryValue | null): number | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function createAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const t = await getTranslations("accountForm");
  const type = String(formData.get("type") ?? "");
  const subtype = String(formData.get("subtype") ?? "");
  const isCredit = subtype === "CREDIT_CARD" || subtype === "PAYLATER";

  let openingBalance = 0n;
  try {
    openingBalance = toBigintOrNull(formData.get("openingBalance")) ?? 0n;
  } catch {
    return { error: t("errOpening") };
  }

  const input = {
    name: String(formData.get("name") ?? "").trim(),
    type,
    subtype: subtype || null,
    openingBalance,
    group: (String(formData.get("group") ?? "").trim() || null) as string | null,
  } as CreateAccountInput;

  if (isCredit) {
    const dueMode = String(formData.get("dueMode") ?? "day");
    (input as CreateAccountInput).last4 =
      (String(formData.get("last4") ?? "").trim() || null) as string | null;
    (input as CreateAccountInput).credit = {
      instrument: subtype as "CREDIT_CARD" | "PAYLATER",
      statementDay: toIntOrNull(formData.get("statementDay")) ?? 1,
      dueDay: dueMode === "day" ? toIntOrNull(formData.get("dueDay")) : null,
      dueOffsetDays: dueMode === "offset" ? toIntOrNull(formData.get("dueOffsetDays")) : null,
      interestRateMonthly: String(formData.get("interestRateMonthly") ?? "0").trim() || "0",
      minPaymentRate: (String(formData.get("minPaymentRate") ?? "").trim() || null) as string | null,
      minPaymentFloor: toBigintOrNull(formData.get("minPaymentFloor")),
      creditLimit: toBigintOrNull(formData.get("creditLimit")),
    };
  }

  try {
    await createAccount(user.id, input);
  } catch (err) {
    if (err instanceof ZodError) {
      return { error: err.issues[0]?.message ?? t("errCheck") };
    }
    return { error: err instanceof Error ? err.message : t("errGeneric") };
  }

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function archiveAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const accountId = String(formData.get("accountId") ?? "");
  const archived = String(formData.get("archived") ?? "true") === "true";
  await setAccountArchived(user.id, accountId, archived);
  revalidatePath("/accounts");
}
