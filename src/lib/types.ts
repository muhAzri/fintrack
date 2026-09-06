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
};

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
