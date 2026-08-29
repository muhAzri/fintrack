"use client";

import { useActionState, useEffect, useRef } from "react";
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
} from "@chakra-ui/react";
import { addExpense, type ExpenseFormState } from "./actions";
import { CATEGORIES } from "@/lib/types";
import { toaster } from "@/components/ui/toaster";

const initialState: ExpenseFormState = {};

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(addExpense, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === initialState || state.error) return;

    formRef.current?.reset();
    amountRef.current?.focus();
    toaster.create({ type: "success", title: "Pengeluaran tersimpan" });
  }, [state]);

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
            </HStack>

            <Field.Root>
              <Field.Label>Catatan (opsional)</Field.Label>
              <Input name="note" placeholder="Makan siang di kantor" />
            </Field.Root>

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
