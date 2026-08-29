"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { signup, type AuthFormState } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthFormState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <AuthCard
      title="Buat akun Fintrack"
      description="Mulai bangun kebiasaan mencatat pengeluaran harianmu."
      footer={
        <Text textAlign="center" color="fg.muted">
          Sudah punya akun?{" "}
          <Text asChild color="teal.fg" fontWeight="medium">
            <Link href="/login">Masuk di sini</Link>
          </Text>
        </Text>
      }
    >
      <form action={formAction}>
        <Stack gap={4}>
          {state.error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Title>{state.error}</Alert.Title>
            </Alert.Root>
          )}

          <Field.Root required>
            <Field.Label>Email</Field.Label>
            <Input
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              autoFocus
              required
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Password</Field.Label>
            <PasswordInput
              name="password"
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              required
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Konfirmasi Password</Field.Label>
            <PasswordInput
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
          </Field.Root>

          <Button type="submit" loading={pending} colorPalette="teal" mt={2}>
            Daftar
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
