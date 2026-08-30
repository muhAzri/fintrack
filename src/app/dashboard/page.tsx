import Link from "next/link";
import { Badge, Button, Card, Flex, Heading, SimpleGrid, Stack, Stat, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { currency } from "@/lib/format";
import {
  computeMonthOverMonth,
  getPreviousMonthBounds,
  groupByCategory,
  splitByMonth,
} from "@/lib/expense-analytics";

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfPreviousMonth = getPreviousMonthBounds(now).start;
  const today = now.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("expenses")
    .select("id, amount, category, note, spent_at")
    .gte("spent_at", startOfPreviousMonth)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });

  const allExpenses = data ?? [];
  const { currentMonthExpenses, previousMonthExpenses } = splitByMonth(allExpenses, now);
  const expenses = currentMonthExpenses;

  const todayTotal = expenses
    .filter((expense) => expense.spent_at === today)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
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

      <ExpenseForm />

      <ExpenseList expenses={expenses} />
    </Stack>
  );
}
