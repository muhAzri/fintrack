export const CATEGORIES = [
  "Makanan & Minuman",
  "Jajanan",
  "Groceries & Suplemen",
  "Transportasi",
  "Belanja",
  "Tagihan & Utilitas",
  "Hiburan",
  "Kesehatan",
  "Lainnya",
] as const;

export type Expense = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  spent_at: string;
};
