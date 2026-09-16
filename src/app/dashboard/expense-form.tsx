"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import {
  Alert,
  Button,
  Card,
  Field,
  HStack,
  Icon,
  Input,
  InputGroup,
  NativeSelect,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import { addExpense, type ExpenseFormState } from "./actions";
import { CATEGORIES, COSTING_METHODS, type ExpenseSource, type StockItem } from "@/lib/types";
import { toaster } from "@/components/ui/toaster";
import { todayLocalDate } from "@/lib/format";

const initialState: ExpenseFormState = {};

const COSTING_METHOD_LABELS: Record<string, string> = {
  average: "Rata-rata tertimbang",
  fifo: "FIFO (per lot pembelian)",
};

function StockPurchaseFields({ stockItems }: { stockItems: StockItem[] }) {
  const [isStock, setIsStock] = useState(false);
  const [itemName, setItemName] = useState("");

  const matchedItem = useMemo(
    () => stockItems.find((item) => item.name.toLowerCase() === itemName.trim().toLowerCase()),
    [stockItems, itemName],
  );

  return (
    <>
      <Switch.Root
        name="isStockPurchase"
        checked={isStock}
        onCheckedChange={(details) => setIsStock(details.checked)}
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label>Ini pembelian stok/bulk (mie, telur, beras, dll)</Switch.Label>
      </Switch.Root>

      {isStock && (
        <Stack gap={4} pl={{ base: 0, sm: 4 }} borderLeftWidth={{ sm: "2px" }} borderColor="border">
          <Field.Root required>
            <Field.Label>Nama barang</Field.Label>
            <Input
              name="stockItemName"
              list="stock-item-names"
              placeholder="Mie instan porang"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              required
              autoComplete="off"
            />
            <datalist id="stock-item-names">
              {stockItems.map((item) => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
          </Field.Root>

          <HStack gap={4} align="start" flexWrap="wrap">
            <Field.Root required maxW={{ base: "full", sm: "36" }}>
              <Field.Label>Isi/jumlah satuan</Field.Label>
              <Input
                name="stockQuantity"
                type="number"
                inputMode="decimal"
                min={1}
                step="1"
                placeholder="40"
                required
              />
            </Field.Root>

            <Field.Root required maxW={{ base: "full", sm: "36" }}>
              <Field.Label>Satuan</Field.Label>
              <Input
                key={matchedItem?.id ?? "new"}
                name="stockUnitLabel"
                placeholder="bungkus"
                defaultValue={matchedItem?.unit_label ?? ""}
                readOnly={Boolean(matchedItem)}
                required
              />
            </Field.Root>

            <Field.Root maxW={{ base: "full", sm: "48" }}>
              <Field.Label>Metode hitung biaya</Field.Label>
              <NativeSelect.Root disabled={Boolean(matchedItem)}>
                <NativeSelect.Field
                  key={matchedItem?.id ?? "new"}
                  name="stockCostingMethod"
                  defaultValue={matchedItem?.costing_method ?? "average"}
                >
                  {COSTING_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {COSTING_METHOD_LABELS[method]}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </HStack>

          <Text fontSize="xs" color="fg.muted">
            {matchedItem
              ? `Barang sudah ada, stok saat ini ${Number(matchedItem.quantity_on_hand)} ${matchedItem.unit_label}. Metode biaya ikut yang sudah diset di halaman Stok.`
              : "Biaya per satuan dihitung otomatis: jumlah dibagi isi/jumlah satuan."}
          </Text>
        </Stack>
      )}
    </>
  );
}

export function ExpenseForm({
  stockItems,
  sources,
  onSuccess,
}: {
  stockItems: StockItem[];
  sources: ExpenseSource[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(addExpense, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Remounts the stock-toggle subtree (resetting its local state) whenever a
  // submit just succeeded - computed during render instead of in an effect,
  // per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevState, setPrevState] = useState(state);
  const [formKey, setFormKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error) {
      setFormKey((key) => key + 1);
    }
  }

  useEffect(() => {
    if (state === initialState || state.error) return;

    formRef.current?.reset();
    amountRef.current?.focus();
    toaster.create({ type: "success", title: "Pengeluaran tersimpan" });
    onSuccess?.();
  }, [state, onSuccess]);

  return (
    <Card.Root variant="outline">
      <Card.Body>
        <form ref={formRef} action={formAction}>
          <Stack gap={4}>
            <Card.Title>Tambah Pengeluaran</Card.Title>

            {state.error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{state.error}</Alert.Title>
              </Alert.Root>
            )}

            <HStack gap={4} align="start" flexWrap="wrap">
              <Field.Root required maxW={{ base: "full", sm: "44" }}>
                <Field.Label>Jumlah</Field.Label>
                <InputGroup startElement="Rp">
                  <Input
                    ref={amountRef}
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="1"
                    placeholder="25000"
                    autoFocus
                    required
                  />
                </InputGroup>
              </Field.Root>

              <Field.Root required maxW={{ base: "full", sm: "48" }}>
                <Field.Label>Kategori</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field name="category" defaultValue={CATEGORIES[0]}>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root required maxW={{ base: "full", sm: "40" }}>
                <Field.Label>Tanggal</Field.Label>
                <Input name="spentAt" type="date" defaultValue={todayLocalDate()} max={todayLocalDate()} required />
              </Field.Root>
            </HStack>

            <Field.Root>
              <Field.Label>Catatan (opsional)</Field.Label>
              <Input name="note" placeholder="Makan siang di kantor" />
            </Field.Root>

            <Field.Root>
              <Field.Label>Sumber dana (opsional)</Field.Label>
              <Input
                name="sourceName"
                list="expense-source-names"
                placeholder="BCA, GoPay, dst."
                autoComplete="off"
              />
              <datalist id="expense-source-names">
                {sources.map((source) => (
                  <option key={source.id} value={source.name} />
                ))}
              </datalist>
            </Field.Root>

            <StockPurchaseFields key={formKey} stockItems={stockItems} />

            <Button type="submit" loading={pending} alignSelf="start" colorPalette="teal">
              <Icon as={FiPlus} />
              Simpan Pengeluaran
            </Button>
          </Stack>
        </form>
      </Card.Body>
    </Card.Root>
  );
}
