"use client";

import { useActionState, useEffect, useRef } from "react";
import { FiPlus } from "react-icons/fi";
import { Alert, Button, Card, Field, HStack, Icon, Input, Stack } from "@chakra-ui/react";
import { createSource, type SourceFormState } from "./actions";
import { toaster } from "@/components/ui/toaster";

const initialState: SourceFormState = {};

export function SourceForm() {
  const [state, formAction, pending] = useActionState(createSource, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === initialState || state.error) return;

    formRef.current?.reset();
    toaster.create({ type: "success", title: "Sumber ditambahkan" });
  }, [state]);

  return (
    <Card.Root variant="outline">
      <Card.Body>
        <form ref={formRef} action={formAction}>
          <Stack gap={4}>
            <Card.Title>Tambah Sumber Pengeluaran</Card.Title>

            {state.error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{state.error}</Alert.Title>
              </Alert.Root>
            )}

            <HStack gap={3} align="end" flexWrap="wrap">
              <Field.Root required flex="1" minW="40">
                <Field.Label>Nama sumber</Field.Label>
                <Input name="name" placeholder="BCA, GoPay, dst." required />
              </Field.Root>

              <Button type="submit" loading={pending} colorPalette="teal">
                <Icon as={FiPlus} />
                Tambah
              </Button>
            </HStack>
          </Stack>
        </form>
      </Card.Body>
    </Card.Root>
  );
}
