"use client";

import { useMemo, useState } from "react";
import { BarList, Chart, useChart } from "@chakra-ui/charts";
import { Card, Heading, NativeSelect, Stack } from "@chakra-ui/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency } from "@/lib/format";
import { buildDailySeries } from "@/lib/expense-analytics";
import type { CategoryBreakdown, DailySeriesPoint } from "@/lib/expense-analytics";
import { CATEGORIES, type Expense } from "@/lib/types";

export function CategoryBreakdownChart({ data }: { data: CategoryBreakdown[] }) {
  const chart = useChart<BarList.Data>({
    data: data.map((entry) => ({ name: entry.category, value: entry.total })),
    series: [{ name: "name", color: "teal.subtle" }],
  });

  if (data.length === 0) {
    return null;
  }

  return (
    <BarList.Root chart={chart}>
      <BarList.Content>
        <BarList.Label title="Kategori">
          <BarList.Bar />
        </BarList.Label>
        <BarList.Label title="Jumlah" titleAlignment="end">
          <BarList.Value valueFormatter={(value) => currency.format(value)} />
        </BarList.Label>
      </BarList.Content>
    </BarList.Root>
  );
}

export function DailyTrendChart({ data }: { data: DailySeriesPoint[] }) {
  const chart = useChart({
    data,
    series: [
      { name: "currentMonth", color: "teal.solid", label: "Bulan ini" },
      { name: "previousMonth", color: "fg.muted", label: "Bulan lalu", strokeDasharray: "4 4" },
    ],
  });

  return (
    <Chart.Root maxH="280px" chart={chart}>
      <ResponsiveContainer>
        <LineChart data={chart.data}>
          <CartesianGrid stroke={chart.color("border")} vertical={false} />
          <XAxis dataKey={chart.key("day")} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(value: number) => currency.format(value)}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            animationDuration={100}
            cursor={false}
            content={
              <Chart.Tooltip
                labelFormatter={(day) => `Tanggal ${day}`}
                formatter={(value) => currency.format(Number(value))}
              />
            }
          />
          <Legend content={<Chart.Legend />} />
          {chart.series.map((item) => (
            <Line
              key={item.name}
              type="monotone"
              dataKey={item.name}
              stroke={chart.color(item.color)}
              strokeWidth={2}
              strokeDasharray={item.strokeDasharray}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
}

export function DailyTrendSection({
  currentMonthExpenses,
  previousMonthExpenses,
  todayTimestamp,
}: {
  currentMonthExpenses: Expense[];
  previousMonthExpenses: Expense[];
  todayTimestamp: number;
}) {
  const [category, setCategory] = useState("all");

  const dailySeries = useMemo(() => {
    const matchesCategory = (expense: Expense) => category === "all" || expense.category === category;
    return buildDailySeries(
      currentMonthExpenses.filter(matchesCategory),
      previousMonthExpenses.filter(matchesCategory),
      new Date(todayTimestamp),
    );
  }, [category, currentMonthExpenses, previousMonthExpenses, todayTimestamp]);

  return (
    <Stack gap={3}>
      <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align={{ sm: "center" }} gap={2}>
        <Heading size="md">Tren harian: bulan ini vs bulan lalu</Heading>
        <NativeSelect.Root size="sm" width={{ base: "full", sm: "56" }}>
          <NativeSelect.Field value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Semua kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Stack>
      <Card.Root variant="outline">
        <Card.Body>
          <DailyTrendChart data={dailySeries} />
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
