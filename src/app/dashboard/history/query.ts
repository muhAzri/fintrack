export type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date_desc", label: "Tanggal terbaru" },
  { value: "date_asc", label: "Tanggal terlama" },
  { value: "amount_desc", label: "Jumlah terbesar" },
  { value: "amount_asc", label: "Jumlah terkecil" },
];

export type HistoryFilterState = {
  month: string;
  category?: string;
  source?: string;
  sort?: SortOption;
  q?: string;
};

export function buildHistoryHref(filters: HistoryFilterState): string {
  const params = new URLSearchParams();
  params.set("month", filters.month);
  if (filters.category) params.set("category", filters.category);
  if (filters.source) params.set("source", filters.source);
  if (filters.sort && filters.sort !== "date_desc") params.set("sort", filters.sort);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return `/dashboard/history?${qs}`;
}
