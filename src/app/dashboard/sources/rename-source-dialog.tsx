"use client";

import { useState, useTransition } from "react";
import { FiEdit2 } from "react-icons/fi";
import { Alert, Button, Dialog, Field, IconButton, Input, Portal, Stack } from "@chakra-ui/react";
import { renameSource } from "./actions";
import type { ExpenseSource } from "@/lib/types";
import { toaster } from "@/components/ui/toaster";

export function RenameSourceDialog({ source }: { source: ExpenseSource }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await renameSource(source.id, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      setOpen(false);
      toaster.create({ type: "success", title: "Sumber diperbarui" });
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
        <IconButton size="sm" variant="ghost" aria-label="Ubah sumber">
          <FiEdit2 />
        </IconButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form action={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>Ubah Sumber</Dialog.Title>
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
                    <Field.Label>Nama sumber</Field.Label>
                    <Input name="name" defaultValue={source.name} required />
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
