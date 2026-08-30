"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export type ExpenseFormState = {
  error?: string;
};

export async function addExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi kamu berakhir, silakan masuk lagi." };
  }

  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? CATEGORIES.at(-1));
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Jumlah harus berupa angka lebih dari 0." };
  }

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    category,
    note: note || null,
  });

  if (error) {
    return { error: "Gagal menyimpan pengeluaran. Coba lagi." };
  }

  revalidatePath("/dashboard");
  return {};
}

export async function updateExpense(
  id: string,
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi kamu berakhir, silakan masuk lagi." };
  }

  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? CATEGORIES.at(-1));
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Jumlah harus berupa angka lebih dari 0." };
  }

  const { error } = await supabase
    .from("expenses")
    .update({ amount, category, note: note || null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Gagal memperbarui pengeluaran. Coba lagi." };
  }

  revalidatePath("/dashboard");
  return {};
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/dashboard");
}
