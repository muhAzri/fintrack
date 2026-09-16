import { Badge, Card, Flex, Stack, Text } from "@chakra-ui/react";
import { DeleteExpenseButton } from "./delete-expense-button";
import { EditExpenseDialog } from "./edit-expense-dialog";
import type { Expense, ExpenseSource } from "@/lib/types";
import { currency } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

export function ExpenseList({
  expenses,
  sources,
}: {
  expenses: Expense[];
  sources: ExpenseSource[];
}) {
  if (expenses.length === 0) {
    return (
      <Card.Root variant="subtle">
        <Card.Body textAlign="center" color="fg.muted" py={10}>
          <Text>Belum ada pengeluaran tercatat bulan ini. Yuk mulai catat!</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Stack gap={3}>
      {expenses.map((expense) => (
        <Card.Root key={expense.id} variant="outline">
          <Card.Body>
            <Flex align="center" justify="space-between" gap={4}>
              <Stack gap={1}>
                <Flex align="center" gap={2} wrap="wrap">
                  <Badge colorPalette="teal">{expense.category}</Badge>
                  <Badge colorPalette={expense.source?.name ? "blue" : "gray"} variant="subtle">
                    {expense.source?.name ?? "Tidak Terkategorisasi"}
                  </Badge>
                  {expense.stock_item_id && (
                    <Badge colorPalette="purple" variant="subtle">
                      Stok · {Number(expense.quantity)}
                    </Badge>
                  )}
                  <Text fontSize="sm" color="fg.muted">
                    {dateFormatter.format(new Date(`${expense.spent_at}T00:00:00`))}
                  </Text>
                </Flex>
                {expense.note && <Text color="fg">{expense.note}</Text>}
              </Stack>

              <Flex align="center" gap={3}>
                <Text fontWeight="semibold" whiteSpace="nowrap">
                  {currency.format(Number(expense.amount))}
                </Text>
                <EditExpenseDialog expense={expense} sources={sources} />
                <DeleteExpenseButton
                  id={expense.id}
                  label={`${expense.category} - ${currency.format(Number(expense.amount))}`}
                />
              </Flex>
            </Flex>
          </Card.Body>
        </Card.Root>
      ))}
    </Stack>
  );
}
