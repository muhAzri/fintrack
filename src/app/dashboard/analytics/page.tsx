import Link from "next/link";
import { Badge, Button, Card, Flex, Heading, SimpleGrid, Stack, Stat, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/format";
import {
  buildDailySeries,
  computeMonthOverMonth,
  getPreviousMonthBounds,
  groupByCategory,
  splitByMonth,
} from "@/lib/expense-analytics";
import { CategoryBreakdownChart, DailyTrendChart } from "./analytics-charts";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfPreviousMonth = getPreviousMonthBounds(now).start;

  const { data } = await supabase
    .from("expenses")
    .select("id, amount, category, note, spent_at")
    .gte("spent_at", startOfPreviousMonth)
    .order("spent_at", { ascending: true });

  const allExpenses = data ?? [];
  const { currentMonthExpenses, previousMonthExpenses } = splitByMonth(allExpenses, now);

  const categoryBreakdown = groupByCategory(currentMonthExpenses);
  const comparison = computeMonthOverMonth(currentMonthExpenses, previousMonthExpenses, now);
  const dailySeries = buildDailySeries(currentMonthExpenses, previousMonthExpenses, now);

  return (
    <Stack gap={8}>
      <Stack gap={1}>
        <Button asChild size="sm" variant="ghost" alignSelf="start">
          <Link href="/dashboard">← Kembali ke dashboard</Link>
        </Button>
        <Heading size="lg">Analisis Pengeluaran</Heading>
        <Text color="fg.muted">
          Breakdown kategori dan perbandingan pengeluaran bulan ini dengan bulan lalu.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
        <Card.Root variant="elevated">
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Bulan ini (s.d. hari ini)</Stat.Label>
              <Stat.ValueText>{currency.format(comparison.currentTotal)}</Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="elevated">
          <Card.Body>
            <Stat.Root>
              <Stat.Label>vs bulan lalu (tanggal yang sama)</Stat.Label>
              {comparison.percentChange !== null ? (
                <Flex align="baseline" gap={2}>
                  <Stat.ValueText>
                    {comparison.percentChange > 0 ? "+" : "-"}
                    {Math.abs(comparison.percentChange).toFixed(0)}%
                  </Stat.ValueText>
                  <Badge colorPalette={comparison.percentChange > 0 ? "red" : "green"}>
                    {comparison.percentChange > 0 ? "Naik" : "Turun"}
                  </Badge>
                </Flex>
              ) : (
                <Text color="fg.muted">Belum ada data pembanding</Text>
              )}
            </Stat.Root>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="subtle">
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Total bulan lalu (penuh, {comparison.previousMonthDayCount} hari)</Stat.Label>
              <Stat.ValueText fontSize="lg">
                {currency.format(comparison.previousMonthFullTotal)}
              </Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Stack gap={3}>
        <Heading size="md">Pengeluaran per kategori (bulan ini)</Heading>
        {categoryBreakdown.length > 0 ? (
          <Card.Root variant="outline">
            <Card.Body>
              <CategoryBreakdownChart data={categoryBreakdown} />
            </Card.Body>
          </Card.Root>
        ) : (
          <Card.Root variant="subtle">
            <Card.Body textAlign="center" color="fg.muted" py={10}>
              <Text>Belum ada pengeluaran tercatat bulan ini.</Text>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>

      <Stack gap={3}>
        <Heading size="md">Tren harian: bulan ini vs bulan lalu</Heading>
        <Card.Root variant="outline">
          <Card.Body>
            <DailyTrendChart data={dailySeries} />
          </Card.Body>
        </Card.Root>
      </Stack>
    </Stack>
  );
}
