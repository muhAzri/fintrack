"use server";

// Transaction server actions (docs/REQUIREMENTS §6.2, §2.2, §5.4). One unified
// entry point switches on the chosen mode; every write is tenant-scoped and
// goes through the ledger/billing engines, which enforce Σ=0 and tenancy.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/dal";
import { postTransaction, reverseTransaction } from "@/lib/ledger";
import { createInstallmentPurchase, recordCardPayment } from "@/lib/billing";
import { parseIDR } from "@/lib/money";

export interface TxFormState {
  error?: string;
}

function positive(formData: FormData, key: string): bigint {
  const value = parseIDR(String(formData.get(key) ?? "0"));
  if (value <= 0n) throw new Error("Amount must be greater than 0.");
  return value;
}

function optional(formData: FormData, key: string): bigint {
  const raw = String(formData.get(key) ?? "").trim();
  return raw ? parseIDR(raw) : 0n;
}

function txDate(formData: FormData): Date {
  const raw = String(formData.get("date") ?? "").trim();
  return raw ? new Date(raw) : new Date();
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function recordTransactionAction(
  _prev: TxFormState,
  formData: FormData,
): Promise<TxFormState> {
  const user = await requireUser();
  const t = await getTranslations("transactionForm");
  const mode = str(formData, "mode");

  try {
    switch (mode) {
      case "expense": {
        // Dr Expense / Cr paid-from (asset or credit card) — §2.2a/b.
        const amount = positive(formData, "amount");
        await postTransaction({
          userId: user.id,
          date: txDate(formData),
          description: str(formData, "description") || "Expense",
          type: "EXPENSE",
          postings: [
            { accountId: str(formData, "expenseAccountId"), amount },
            { accountId: str(formData, "sourceAccountId"), amount: -amount },
          ],
        });
        break;
      }
      case "income": {
        // Dr Asset / Cr Income — §2.2e.
        const amount = positive(formData, "amount");
        await postTransaction({
          userId: user.id,
          date: txDate(formData),
          description: str(formData, "description") || "Income",
          type: "INCOME",
          postings: [
            { accountId: str(formData, "assetAccountId"), amount },
            { accountId: str(formData, "incomeAccountId"), amount: -amount },
          ],
        });
        break;
      }
      case "transfer": {
        // Dr destination (+ Dr fee) / Cr source — §2.2d/e2. Fee is optional.
        const amount = positive(formData, "amount");
        const fee = optional(formData, "fee");
        const postings = [
          { accountId: str(formData, "toAccountId"), amount },
          { accountId: str(formData, "fromAccountId"), amount: -(amount + fee) },
        ];
        if (fee > 0n) {
          postings.push({ accountId: str(formData, "feeAccountId"), amount: fee });
        }
        await postTransaction({
          userId: user.id,
          date: txDate(formData),
          description: str(formData, "description") || "Transfer",
          type: "TRANSFER",
          postings,
        });
        break;
      }
      case "payment": {
        // CC_PAYMENT — a transfer to the card, not an expense (§5.4).
        await recordCardPayment(user.id, {
          creditAccountId: str(formData, "creditAccountId"),
          sourceAccountId: str(formData, "sourceAccountId"),
          amount: positive(formData, "amount"),
          date: txDate(formData),
          description: str(formData, "description") || undefined,
        });
        break;
      }
      case "installment": {
        // Full liability up front + schedule (§5.3).
        await createInstallmentPurchase(user.id, {
          creditAccountId: str(formData, "creditAccountId"),
          expenseAccountId: str(formData, "expenseAccountId"),
          principal: positive(formData, "amount"),
          tenorMonths: Number(str(formData, "tenorMonths")),
          interestRateMonthly: str(formData, "interestRateMonthly") || "0",
          date: txDate(formData),
          description: str(formData, "description") || "Installment purchase",
        });
        break;
      }
      default:
        return { error: t("errUnknown") };
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Amount must be greater than 0.") {
      return { error: t("errPositive") };
    }
    return { error: t("errGeneric") };
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function reverseTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await reverseTransaction(user.id, String(formData.get("transactionId") ?? ""));
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
