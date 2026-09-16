export const CATEGORIES = [
  "Makanan & Minuman",
  "Jajanan",
  "Groceries & Suplemen",
  "Transportasi",
  "Belanja",
  "Tagihan & Utilitas",
  "Hiburan",
  "Kesehatan",
  "Rumah Tangga",
  "Lainnya",
] as const;

export type Expense = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  spent_at: string;
  stock_item_id?: string | null;
  quantity?: number | null;
  source_id?: string | null;
  source?: { name: string } | null;
};

export type ExpenseSource = {
  id: string;
  name: string;
};

/**
 * Without generated Database types, supabase-js can't tell that
 * `expenses.source_id` is a many-to-one FK, so it types the embedded
 * `source:expense_sources(name)` relation as an array even though
 * PostgREST returns a single object (or null) at runtime. Normalize
 * either shape here instead of trusting the inferred type.
 */
export function normalizeExpenseSource(
  source: { name: string } | { name: string }[] | null | undefined,
): { name: string } | null {
  if (!source) return null;
  return Array.isArray(source) ? (source[0] ?? null) : source;
}

export const COSTING_METHODS = ["average", "fifo"] as const;
export type CostingMethod = (typeof COSTING_METHODS)[number];

export type StockItem = {
  id: string;
  name: string;
  unit_label: string;
  category: string;
  costing_method: CostingMethod;
  quantity_on_hand: number;
  avg_unit_cost: number;
};

export type StockUsage = {
  id: string;
  stock_item_id: string;
  quantity: number;
  realized_amount: number;
  used_at: string;
  note: string | null;
};
