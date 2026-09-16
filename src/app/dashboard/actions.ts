"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import { todayLocalDate } from "@/lib/format";

export type ExpenseFormState = {
  error?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseSpentAt(formData: FormData): { value: string } | { error: string } {
  const raw = String(formData.get("spentAt") ?? "").trim();
  if (!raw) return { value: todayLocalDate() };
  if (!DATE_RE.test(raw) || Number.isNaN(new Date(raw).getTime())) {
    return { error: "Tanggal tidak valid." };
  }
  if (raw > todayLocalDate()) {
    return { error: "Tanggal transaksi tidak boleh di masa depan." };
  }
  return { value: raw };
}

async function resolveSourceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rawName: string,
): Promise<{ id: string | null; error?: string }> {
  const name = rawName.trim();
  if (!name) return { id: null };

  const { data: sources } = await supabase
    .from("expense_sources")
    .select("id, name")
    .eq("user_id", userId);

  const match = (sources ?? []).find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (match) return { id: match.id };

  const { data: created, error } = await supabase
    .from("expense_sources")
    .insert({ user_id: userId, name })
    .select("id")
    .single();

  if (!error) return { id: created.id };

  if (error.code === "23505") {
    const { data: retry } = await supabase
      .from("expense_sources")
      .select("id, name")
      .eq("user_id", userId);
    const retryMatch = (retry ?? []).find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (retryMatch) return { id: retryMatch.id };
  }

  return { id: null, error: "Gagal menyimpan sumber pengeluaran." };
}

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
  const sourceName = String(formData.get("sourceName") ?? "");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Jumlah harus berupa angka lebih dari 0." };
  }

  const spentAt = parseSpentAt(formData);
  if ("error" in spentAt) {
    return { error: spentAt.error };
  }

  const { id: sourceId, error: sourceError } = await resolveSourceId(supabase, user.id, sourceName);
  if (sourceError) {
    return { error: sourceError };
  }

  const isStockPurchase = formData.get("isStockPurchase") === "on";

  if (isStockPurchase) {
    const itemName = String(formData.get("stockItemName") ?? "").trim();
    const unitLabel = String(formData.get("stockUnitLabel") ?? "").trim();
    const quantity = Number(formData.get("stockQuantity"));
    const costingMethod = String(formData.get("stockCostingMethod") ?? "average");

    if (!itemName) {
      return { error: "Nama barang wajib diisi." };
    }
    if (!unitLabel) {
      return { error: "Satuan wajib diisi." };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Isi/jumlah satuan harus lebih dari 0." };
    }

    const { data: expenseId, error } = await supabase.rpc("create_stock_purchase", {
      p_amount: amount,
      p_category: category,
      p_note: note || null,
      p_item_name: itemName,
      p_unit_label: unitLabel,
      p_quantity: quantity,
      p_costing_method: costingMethod,
      p_spent_at: spentAt.value,
    });

    if (error) {
      return { error: "Gagal menyimpan pembelian stok. Coba lagi." };
    }

    if (sourceId && expenseId) {
      await supabase
        .from("expenses")
        .update({ source_id: sourceId })
        .eq("id", expenseId)
        .eq("user_id", user.id);
    }
  } else {
    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      amount,
      category,
      note: note || null,
      source_id: sourceId,
      spent_at: spentAt.value,
    });

    if (error) {
      return { error: "Gagal menyimpan pengeluaran. Coba lagi." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stock");
  revalidatePath("/dashboard/analytics");
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
  const sourceName = String(formData.get("sourceName") ?? "");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Jumlah harus berupa angka lebih dari 0." };
  }

  const spentAt = parseSpentAt(formData);
  if ("error" in spentAt) {
    return { error: spentAt.error };
  }

  const { id: sourceId, error: sourceError } = await resolveSourceId(supabase, user.id, sourceName);
  if (sourceError) {
    return { error: sourceError };
  }

  const { error } = await supabase
    .from("expenses")
    .update({ amount, category, note: note || null, source_id: sourceId, spent_at: spentAt.value })
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
  await supabase.rpc("delete_stock_purchase_expense", { p_expense_id: id });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stock");
  revalidatePath("/dashboard/analytics");
}
