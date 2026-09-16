"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SourceFormState = {
  error?: string;
};

export async function createSource(
  _prevState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi kamu berakhir, silakan masuk lagi." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Nama sumber wajib diisi." };
  }

  const { error } = await supabase.from("expense_sources").insert({ user_id: user.id, name });

  if (error) {
    if (error.code === "23505") {
      return { error: "Sumber dengan nama itu sudah ada." };
    }
    return { error: "Gagal menambahkan sumber. Coba lagi." };
  }

  revalidatePath("/dashboard/sources");
  revalidatePath("/dashboard");
  return {};
}

export async function renameSource(
  id: string,
  _prevState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi kamu berakhir, silakan masuk lagi." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Nama sumber wajib diisi." };
  }

  const { error } = await supabase
    .from("expense_sources")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Sumber dengan nama itu sudah ada." };
    }
    return { error: "Gagal mengubah sumber. Coba lagi." };
  }

  revalidatePath("/dashboard/sources");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteSource(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("expense_sources").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard/sources");
  revalidatePath("/dashboard");
}
