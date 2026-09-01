"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COSTING_METHODS, type CostingMethod } from "@/lib/types";

export type StockActionState = {
  error?: string;
};

export async function logStockUsage(
  _prevState: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi kamu berakhir, silakan masuk lagi." };
  }

  const stockItemId = String(formData.get("stockItemId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const usedAt = String(formData.get("usedAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!stockItemId) {
    return { error: "Barang tidak ditemukan." };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Jumlah pemakaian harus lebih dari 0." };
  }

  const { error } = await supabase.rpc("log_stock_usage", {
    p_stock_item_id: stockItemId,
    p_quantity: quantity,
    p_used_at: usedAt || null,
    p_note: note || null,
  });

  if (error) {
    return { error: "Gagal mencatat pemakaian. Coba lagi." };
  }

  revalidatePath("/dashboard/stock");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  return {};
}

export async function updateCostingMethod(stockItemId: string, method: string) {
  if (!COSTING_METHODS.includes(method as CostingMethod)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("stock_items")
    .update({ costing_method: method })
    .eq("id", stockItemId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/stock");
}
