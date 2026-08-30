"use client";

import { useState, useTransition } from "react";
import { FiEdit2 } from "react-icons/fi";
import {
  Alert,
  Button,
  Dialog,
  Field,
  IconButton,
  Input,
  InputGroup,
  NativeSelect,
  Portal,
  Stack,
} from "@chakra-ui/react";
import { updateExpense } from "./actions";
import { CATEGORIES, type Expense } from "@/lib/types";
import { toaster } from "@/components/ui/toaster";

export function EditExpenseDialog({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateExpense(expense.id, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      setOpen(false);
      toaster.create({ type: "success", title: "Pengeluaran diperbarui" });
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
        if (!details.open) setError(undefined);
      }}
    >
      <Dialog.Trigger asChild>
        <IconButton size="sm" variant="ghost" aria-label="Ubah pengeluaran">
          <FiEdit2 />
        </IconButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form action={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>Ubah Pengeluaran</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <Stack gap={4}>
                  {error && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                  )}

                  <Field.Root required>
                    <Field.Label>Jumlah</Field.Label>
                    <InputGroup startElement="Rp">
                      <Input
                        name="amount"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        step="1"
                        defaultValue={expense.amount}
                        required
                      />
                    </InputGroup>
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label>Kategori</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field name="category" defaultValue={expense.category}>
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Catatan (opsional)</Field.Label>
                    <Input name="note" defaultValue={expense.note ?? ""} />
                  </Field.Root>
                </Stack>
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="ghost">Batal</Button>
                </Dialog.ActionTrigger>
                <Button type="submit" loading={pending} colorPalette="teal">
                  Simpan Perubahan
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
