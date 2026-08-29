import { Card, Heading, SimpleGrid, Stack, Stat, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("expenses")
    .select("id, amount, category, note, spent_at")
    .gte("spent_at", startOfMonth)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });

  const expenses = data ?? [];
  const todayTotal = expenses
    .filter((expense) => expense.spent_at === today)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

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

      <ExpenseForm />

      <ExpenseList expenses={expenses} />
    </Stack>
  );
}
