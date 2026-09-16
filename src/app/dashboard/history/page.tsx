import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Card, Flex, HStack, Heading, Stack, Stat, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/format";
import { MonthPicker } from "./month-picker";
import { TransactionTable } from "./transaction-table";

const MONTH_RE = /^\d{4}-\d{2}$/;

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
  const monthParam = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const { year, month } = parseMonthParam(monthParam);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { start, end } = monthBounds(year, month);

  const now = new Date();
  const disableNext =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const supabase = await createClient();
  const [{ data }, { data: sourcesData }] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, amount, category, note, spent_at, stock_item_id, quantity, source_id, source:expense_sources(name)",
      )
      .gte("spent_at", start)
      .lte("spent_at", end)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("expense_sources").select("id, name").order("name", { ascending: true }),
  ]);

  const expenses = data ?? [];
  const sources = sourcesData ?? [];
  const monthTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthLabel = monthLabelFormatter.format(new Date(year, month, 1));

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

      <MonthPicker monthKey={monthKey} monthLabel={monthLabel} disableNext={disableNext} />

      <Card.Root variant="elevated">
        <Card.Body>
          <Stat.Root>
            <Stat.Label>Total {monthLabel}</Stat.Label>
            <Stat.ValueText>{currency.format(monthTotal)}</Stat.ValueText>
          </Stat.Root>
        </Card.Body>
      </Card.Root>

      {expenses.length === 0 ? (
        <Card.Root variant="subtle">
          <Card.Body textAlign="center" color="fg.muted" py={10}>
            <Text>Tidak ada transaksi tercatat di {monthLabel}.</Text>
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
