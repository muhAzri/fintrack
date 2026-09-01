import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Card, Flex, Heading, HStack, Stack, Table, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/format";
import { StockItemCard } from "./stock-item-card";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

export default async function StockPage() {
  const supabase = await createClient();

  const [{ data: stockItemsData }, { data: usagesData }] = await Promise.all([
    supabase
      .from("stock_items")
      .select("id, name, unit_label, category, costing_method, quantity_on_hand, avg_unit_cost")
      .order("name", { ascending: true }),
    supabase
      .from("stock_usages")
      .select("id, quantity, realized_amount, used_at, note, stock_item:stock_items(name, unit_label)")
      .order("used_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const stockItems = stockItemsData ?? [];
  const usages = usagesData ?? [];

  return (
    <Stack gap={8}>
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
        <Heading size="lg">Stok Barang</Heading>
        <Text color="fg.muted">
          Barang yang dibeli bulk tapi dipakai sedikit-sedikit. Uangnya sudah keluar saat beli,
          tapi baru dihitung sebagai pengeluaran &quot;terpakai&quot; saat kamu catat pemakaiannya di sini.
        </Text>
      </Stack>

      {stockItems.length === 0 ? (
        <Card.Root variant="subtle">
          <Card.Body textAlign="center" color="fg.muted" py={10}>
            <Text>
              Belum ada barang stok. Tambahkan lewat form pengeluaran di dashboard, aktifkan
              opsi &quot;Ini pembelian stok/bulk&quot;.
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <Stack gap={4}>
          {stockItems.map((item) => (
            <StockItemCard key={item.id} item={item} />
          ))}
        </Stack>
      )}

      <Stack gap={3}>
        <Heading size="md">Riwayat pemakaian terakhir</Heading>
        {usages.length === 0 ? (
          <Card.Root variant="subtle">
            <Card.Body textAlign="center" color="fg.muted" py={10}>
              <Text>Belum ada pemakaian tercatat.</Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <>
            <Card.Root variant="outline" display={{ base: "none", md: "block" }}>
              <Card.Body>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Tanggal</Table.ColumnHeader>
                      <Table.ColumnHeader>Barang</Table.ColumnHeader>
                      <Table.ColumnHeader>Jumlah</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="end">Realisasi</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {usages.map((usage) => {
                      const stockItem = usage.stock_item?.[0];
                      return (
                        <Table.Row key={usage.id}>
                          <Table.Cell>
                            {dateFormatter.format(new Date(`${usage.used_at}T00:00:00`))}
                          </Table.Cell>
                          <Table.Cell>
                            {stockItem?.name ?? "-"}
                            {usage.note && (
                              <Text as="span" color="fg.muted">
                                {" "}
                                · {usage.note}
                              </Text>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {Number(usage.quantity)} {stockItem?.unit_label ?? ""}
                          </Table.Cell>
                          <Table.Cell textAlign="end">
                            {currency.format(Number(usage.realized_amount))}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>

            <Stack gap={2} display={{ base: "flex", md: "none" }}>
              {usages.map((usage) => {
                const stockItem = usage.stock_item?.[0];
                return (
                  <Card.Root key={usage.id} variant="outline">
                    <Card.Body py={3}>
                      <Flex align="center" justify="space-between" gap={2}>
                        <Stack gap={0}>
                          <Text fontWeight="semibold">{stockItem?.name ?? "-"}</Text>
                          <Text fontSize="sm" color="fg.muted">
                            {dateFormatter.format(new Date(`${usage.used_at}T00:00:00`))} ·{" "}
                            {Number(usage.quantity)} {stockItem?.unit_label ?? ""}
                            {usage.note && ` · ${usage.note}`}
                          </Text>
                        </Stack>
                        <Text fontWeight="semibold" whiteSpace="nowrap">
                          {currency.format(Number(usage.realized_amount))}
                        </Text>
                      </Flex>
                    </Card.Body>
                  </Card.Root>
                );
              })}
            </Stack>
          </>
        )}
      </Stack>
    </Stack>
  );
}
