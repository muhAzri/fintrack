"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { FiCheck } from "react-icons/fi";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Flex,
  HStack,
  Icon,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";
import { logStockUsage, updateCostingMethod, type StockActionState } from "./actions";
import { COSTING_METHODS, type StockItem } from "@/lib/types";
import { currency } from "@/lib/format";
import { toaster } from "@/components/ui/toaster";

const initialState: StockActionState = {};

const COSTING_METHOD_LABELS: Record<string, string> = {
  average: "Rata-rata tertimbang",
  fifo: "FIFO (per lot pembelian)",
};

const today = () => new Date().toISOString().slice(0, 10);

export function StockItemCard({ item }: { item: StockItem }) {
  const [state, formAction, pending] = useActionState(logStockUsage, initialState);
  const [methodPending, startMethodTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === initialState || state.error) return;

    formRef.current?.reset();
    toaster.create({ type: "success", title: `Pemakaian ${item.name} tercatat` });
  }, [state, item.name]);

  const quantityOnHand = Number(item.quantity_on_hand);
  const avgUnitCost = Number(item.avg_unit_cost);
  const value = quantityOnHand * avgUnitCost;

  return (
    <Card.Root variant="outline">
      <Card.Body>
        <Stack gap={4}>
          <Flex align="start" justify="space-between" gap={4} wrap="wrap">
            <Stack gap={1}>
              <HStack gap={2}>
                <Card.Title>{item.name}</Card.Title>
                <Badge colorPalette="teal" variant="subtle">
                  {item.category}
                </Badge>
              </HStack>
              <Text color="fg.muted" fontSize="sm">
                Stok: {quantityOnHand} {item.unit_label} · Biaya/satuan{" "}
                {currency.format(avgUnitCost)} · Nilai stok {currency.format(value)}
              </Text>
            </Stack>

            <NativeSelect.Root size="sm" width="52" disabled={methodPending}>
              <NativeSelect.Field
                defaultValue={item.costing_method}
                onChange={(event) => {
                  const method = event.target.value;
                  startMethodTransition(() => {
                    updateCostingMethod(item.id, method);
                  });
                }}
              >
                {COSTING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {COSTING_METHOD_LABELS[method]}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Flex>

          {state.error && (
            <Alert.Root status="error" size="sm">
              <Alert.Indicator />
              <Alert.Title>{state.error}</Alert.Title>
            </Alert.Root>
          )}

          <form ref={formRef} action={formAction}>
            <input type="hidden" name="stockItemId" value={item.id} />
            <HStack gap={3} align="end" flexWrap="wrap">
              <Field.Root required maxW="32">
                <Field.Label>Jumlah dipakai</Field.Label>
                <Input
                  name="quantity"
                  type="number"
                  inputMode="decimal"
                  min={0.001}
                  step="any"
                  placeholder="1"
                  required
                />
              </Field.Root>

              <Field.Root maxW="40">
                <Field.Label>Tanggal</Field.Label>
                <Input name="usedAt" type="date" defaultValue={today()} />
              </Field.Root>

              <Field.Root flex="1" minW="40">
                <Field.Label>Catatan (opsional)</Field.Label>
                <Input name="note" placeholder="Makan siang" />
              </Field.Root>

              <Button type="submit" loading={pending} colorPalette="teal" size="sm">
                <Icon as={FiCheck} />
                Catat Pemakaian
              </Button>
            </HStack>
          </form>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
