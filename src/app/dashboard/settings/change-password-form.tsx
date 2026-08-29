"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, Card, Field, Stack } from "@chakra-ui/react";
import { changePassword, type ChangePasswordState } from "./actions";
import { PasswordInput } from "@/components/ui/password-input";
import { toaster } from "@/components/ui/toaster";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === initialState || state.error) return;

    formRef.current?.reset();
    toaster.create({ type: "success", title: "Password berhasil diganti" });
  }, [state]);

  return (
    <Card.Root variant="outline">
      <Card.Body>
        <form ref={formRef} action={formAction}>
          <Stack gap={4}>
            <Card.Title>Ganti Password</Card.Title>

            {state.error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{state.error}</Alert.Title>
              </Alert.Root>
            )}

            <Field.Root required>
              <Field.Label>Password saat ini</Field.Label>
              <PasswordInput
                name="currentPassword"
                autoComplete="current-password"
                required
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Password baru</Field.Label>
              <PasswordInput
                name="newPassword"
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
                required
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Konfirmasi password baru</Field.Label>
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                required
              />
            </Field.Root>

            <Button type="submit" loading={pending} alignSelf="start" colorPalette="teal">
              Ganti Password
            </Button>
          </Stack>
        </form>
      </Card.Body>
    </Card.Root>
  );
}
