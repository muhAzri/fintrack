import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: stockItemsData }, { data: sourcesData }] = await Promise.all([
    supabase
      .from("stock_items")
      .select("id, name, unit_label, category, costing_method, quantity_on_hand, avg_unit_cost")
      .order("name", { ascending: true }),
    supabase.from("expense_sources").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      stockItems={stockItemsData ?? []}
      sources={sourcesData ?? []}
    >
      {children}
    </DashboardShell>
  );
}
