import Link from "next/link";
import { FiPackage } from "react-icons/fi";
import { Badge, Box, Button, Card, Flex, Heading, Icon, SimpleGrid, Stack, Stat, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { currency } from "@/lib/format";
import { CategoryBreakdownChart } from "./analytics/analytics-charts";
import {
  computeMonthOverMonth,
  getPreviousMonthBounds,
  groupByCategory,
  splitByMonth,
  toRealizedExpenses,
} from "@/lib/expense-analytics";
import { normalizeExpenseSource, type Expense } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfPreviousMonth = getPreviousMonthBounds(now).start;
  const today = now.toISOString().slice(0, 10);

  const [{ data }, { data: stockItemsData }, { data: usagesData }, { data: sourcesData }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select(
          "id, amount, category, note, spent_at, stock_item_id, quantity, source_id, source:expense_sources(name)",
        )
        .gte("spent_at", startOfPreviousMonth)
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("stock_items")
        .select("id, name, unit_label, category, costing_method, quantity_on_hand, avg_unit_cost")
        .order("name", { ascending: true }),
      supabase
        .from("stock_usages")
        .select("id, quantity, realized_amount, used_at, note, stock_item:stock_items(name, category)")
        .gte("used_at", startOfPreviousMonth),
      supabase.from("expense_sources").select("id, name").order("name", { ascending: true }),
    ]);

  const allExpenses: Expense[] = (data ?? []).map((row) => ({
    ...row,
    source: normalizeExpenseSource(row.source),
  }));
  const stockItems = stockItemsData ?? [];
  const usages = usagesData ?? [];
  const sources = sourcesData ?? [];

  const { currentMonthExpenses, previousMonthExpenses } = splitByMonth(allExpenses, now);
  const expenses = currentMonthExpenses;

  const todayExpenses = expenses.filter((expense) => expense.spent_at === today);
  const todayTotal = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const todayByCategory = groupByCategory(todayExpenses);
  const monthTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const realizedExpenses = toRealizedExpenses(allExpenses, usages);
  const { currentMonthExpenses: realizedCurrentMonth } = splitByMonth(realizedExpenses, now);
  const realizedTodayTotal = realizedCurrentMonth
    .filter((expense) => expense.spent_at === today)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const realizedMonthTotal = realizedCurrentMonth.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );
  const stockValue = stockItems.reduce(
    (sum, item) => sum + Number(item.quantity_on_hand) * Number(item.avg_unit_cost),
    0,
  );

  const topCategory = groupByCategory(currentMonthExpenses).at(0);
  const comparison = computeMonthOverMonth(currentMonthExpenses, previousMonthExpenses, now);

  return (
    <Stack gap={8}>
      <Stack gap={1}>
        <Heading size="lg">Catat Pengeluaran</Heading>
        <Text color="fg.muted">
          Konsisten catat tiap hari, biar kebiasaannya makin kuat.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <Card.Root variant="elevated">
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Hari ini</Stat.Label>
              <Stat.ValueText>{currency.format(todayTotal)}</Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
        <Card.Root variant="elevated">
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Bulan ini</Stat.Label>
              <Stat.ValueText>{currency.format(monthTotal)}</Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Stack gap={3}>
        <Heading size="md">Pengeluaran hari ini per kategori</Heading>
        {todayByCategory.length > 0 ? (
          <Card.Root variant="outline">
            <Card.Body>
              <CategoryBreakdownChart data={todayByCategory} />
            </Card.Body>
          </Card.Root>
        ) : (
          <Card.Root variant="subtle">
            <Card.Body textAlign="center" color="fg.muted" py={6}>
              <Text>Belum ada pengeluaran hari ini.</Text>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>

      <Card.Root variant="outline">
        <Card.Body>
          <Flex align="center" justify="space-between" gap={4} wrap="wrap">
            <Stack gap={1}>
              {topCategory ? (
                <Flex align="center" gap={2} wrap="wrap">
                  <Text color="fg.muted" fontSize="sm">
                    Kategori terbesar bulan ini
                  </Text>
                  <Badge colorPalette="teal">{topCategory.category}</Badge>
                  <Text fontWeight="semibold">{currency.format(topCategory.total)}</Text>
                </Flex>
              ) : (
                <Text color="fg.muted" fontSize="sm">
                  Belum ada pengeluaran bulan ini.
                </Text>
              )}
              {comparison.percentChange !== null && (
                <Flex align="center" gap={2}>
                  <Badge colorPalette={comparison.percentChange > 0 ? "red" : "green"}>
                    {comparison.percentChange > 0 ? "▲" : "▼"}{" "}
                    {Math.abs(comparison.percentChange).toFixed(0)}%
                  </Badge>
                  <Text color="fg.muted" fontSize="sm">
                    vs bulan lalu (s.d. tanggal yang sama)
                  </Text>
                </Flex>
              )}
            </Stack>

            <Button asChild size="sm" variant="ghost" colorPalette="teal">
              <Link href="/dashboard/analytics">Lihat detail →</Link>
            </Button>
          </Flex>
        </Card.Body>
      </Card.Root>

      {stockItems.length > 0 && (
        <Card.Root variant="subtle">
          <Card.Body>
            <Flex align="center" justify="space-between" gap={4} wrap="wrap">
              <Stack gap={1}>
                <Text color="fg.muted" fontSize="sm">
                  Realisasi pemakaian stok (barang yang sudah benar-benar dipakai)
                </Text>
                <Flex align="baseline" gap={5} wrap="wrap">
                  <Text>
                    Hari ini{" "}
                    <Text as="span" fontWeight="semibold">
                      {currency.format(realizedTodayTotal)}
                    </Text>
                  </Text>
                  <Text>
                    Bulan ini{" "}
                    <Text as="span" fontWeight="semibold">
                      {currency.format(realizedMonthTotal)}
                    </Text>
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    Nilai stok belum terpakai: {currency.format(stockValue)}
                  </Text>
                </Flex>
              </Stack>

              <Button asChild size="sm" variant="ghost" colorPalette="teal">
                <Link href="/dashboard/stock">
                  <Icon>
                    <FiPackage />
                  </Icon>
                  Kelola Stok →
                </Link>
              </Button>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      <Box display={{ base: "none", md: "block" }}>
        <ExpenseForm stockItems={stockItems} sources={sources} />
      </Box>

      <ExpenseList expenses={expenses} sources={sources} />
    </Stack>
  );
}
