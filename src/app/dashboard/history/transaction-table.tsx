import { Badge, Card, Flex, Stack, Table, Text } from "@chakra-ui/react";
import { EditExpenseDialog } from "../edit-expense-dialog";
import { DeleteExpenseButton } from "../delete-expense-button";
import type { Expense, ExpenseSource } from "@/lib/types";
import { currency } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

export function TransactionTable({
  expenses,
  sources,
}: {
  expenses: Expense[];
  sources: ExpenseSource[];
}) {
  return (
    <>
      <Card.Root variant="outline" display={{ base: "none", md: "block" }}>
        <Card.Body>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Tanggal</Table.ColumnHeader>
                <Table.ColumnHeader>Kategori</Table.ColumnHeader>
                <Table.ColumnHeader>Catatan</Table.ColumnHeader>
                <Table.ColumnHeader>Sumber</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Jumlah</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Aksi</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {expenses.map((expense) => (
                <Table.Row key={expense.id}>
                  <Table.Cell whiteSpace="nowrap">
                    {dateFormatter.format(new Date(`${expense.spent_at}T00:00:00`))}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="teal">{expense.category}</Badge>
                    {expense.stock_item_id && (
                      <Badge colorPalette="purple" variant="subtle" ml={2}>
                        Stok · {Number(expense.quantity)}
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell color="fg.muted">{expense.note || "-"}</Table.Cell>
                  <Table.Cell>{expense.source?.name ?? "-"}</Table.Cell>
                  <Table.Cell textAlign="end" fontWeight="semibold" whiteSpace="nowrap">
                    {currency.format(Number(expense.amount))}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    <Flex justify="end" gap={1}>
                      <EditExpenseDialog expense={expense} sources={sources} />
                      <DeleteExpenseButton
                        id={expense.id}
                        label={`${expense.category} - ${currency.format(Number(expense.amount))}`}
                      />
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>

      <Stack gap={3} display={{ base: "flex", md: "none" }}>
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
    </>
  );
}
