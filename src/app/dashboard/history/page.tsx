import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Card, Flex, HStack, Heading, Stack, Stat, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/format";
import { CATEGORIES, normalizeExpenseSource, type Expense } from "@/lib/types";
import { MonthPicker } from "./month-picker";
import { HistoryFilters } from "./history-filters";
import { TransactionTable } from "./transaction-table";
import { SORT_OPTIONS, type SortOption } from "./query";

const MONTH_RE = /^\d{4}-\d{2}$/;
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value));

function firstParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const monthLabelFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

function parseMonthParam(raw: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (raw && MONTH_RE.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month: month - 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  return {
    start: toDateKey(new Date(year, month, 1)),
    end: toDateKey(new Date(year, month + 1, 0)),
  };
}

export default async function HistoryPage(props: PageProps<"/dashboard/history">) {
  const searchParams = await props.searchParams;
  const monthParam = firstParam(searchParams.month);
  const { year, month } = parseMonthParam(monthParam);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { start, end } = monthBounds(year, month);

  const categoryParam = firstParam(searchParams.category);
  const category = categoryParam && (CATEGORIES as readonly string[]).includes(categoryParam)
    ? categoryParam
    : undefined;
  const source = firstParam(searchParams.source);
  const sortParam = firstParam(searchParams.sort);
  const sort: SortOption = sortParam && SORT_VALUES.has(sortParam as SortOption)
    ? (sortParam as SortOption)
    : "date_desc";
  const q = firstParam(searchParams.q)?.trim() || undefined;

  const filters = { month: monthKey, category, source, sort, q };

  const now = new Date();
  const disableNext =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const supabase = await createClient();

  let expenseQuery = supabase
    .from("expenses")
    .select(
      "id, amount, category, note, spent_at, stock_item_id, quantity, source_id, source:expense_sources(name)",
    )
    .gte("spent_at", start)
    .lte("spent_at", end);

  if (category) expenseQuery = expenseQuery.eq("category", category);
  if (source === "none") expenseQuery = expenseQuery.is("source_id", null);
  else if (source) expenseQuery = expenseQuery.eq("source_id", source);
  if (q) expenseQuery = expenseQuery.ilike("note", `%${q}%`);

  switch (sort) {
    case "date_asc":
      expenseQuery = expenseQuery
        .order("spent_at", { ascending: true })
        .order("created_at", { ascending: true });
      break;
    case "amount_desc":
      expenseQuery = expenseQuery
        .order("amount", { ascending: false })
        .order("spent_at", { ascending: false });
      break;
    case "amount_asc":
      expenseQuery = expenseQuery
        .order("amount", { ascending: true })
        .order("spent_at", { ascending: false });
      break;
    default:
      expenseQuery = expenseQuery
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false });
  }

  const [{ data }, { data: sourcesData }] = await Promise.all([
    expenseQuery,
    supabase.from("expense_sources").select("id, name").order("name", { ascending: true }),
  ]);

  const expenses: Expense[] = (data ?? []).map((row) => ({
    ...row,
    source: normalizeExpenseSource(row.source),
  }));
  const sources = sourcesData ?? [];
  const monthTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthLabel = monthLabelFormatter.format(new Date(year, month, 1));
  const hasActiveFilters = Boolean(category || source || q);

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <HStack
          asChild
          gap={1}
          fontSize="sm"
          color="fg.muted"
          _hover={{ color: "fg" }}
          w="fit-content"
          display={{ base: "none", md: "flex" }}
        >
          <Link href="/dashboard">
            <FiArrowLeft />
            Kembali ke Dashboard
          </Link>
        </HStack>
        <Heading size="lg">Riwayat Transaksi</Heading>
        <Text color="fg.muted">
          Pilih bulan untuk lihat semua transaksinya, lalu ubah atau hapus kalau ada yang keliru.
        </Text>
      </Stack>

      <MonthPicker
        monthKey={monthKey}
        monthLabel={monthLabel}
        disableNext={disableNext}
        filters={filters}
      />

      <HistoryFilters filters={filters} sources={sources} />

      <Card.Root variant="elevated">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>{hasActiveFilters ? "Total (sesuai filter)" : `Total ${monthLabel}`}</Stat.Label>
            <Stat.ValueText>{currency.format(monthTotal)}</Stat.ValueText>
          </Stat.Root>
        </Card.Body>
      </Card.Root>

      {expenses.length === 0 ? (
        <Card.Root variant="subtle">
          <Card.Body textAlign="center" color="fg.muted" py={10}>
            <Text>
              {hasActiveFilters
                ? "Tidak ada transaksi yang cocok dengan filter di bulan ini."
                : `Tidak ada transaksi tercatat di ${monthLabel}.`}
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <Flex direction="column" gap={3}>
          <Text fontSize="sm" color="fg.muted">
            {expenses.length} transaksi
          </Text>
          <TransactionTable expenses={expenses} sources={sources} />
        </Flex>
      )}
    </Stack>
  );
}
