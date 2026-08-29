"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { login, type AuthFormState } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthFormState = {};

export function LoginForm({ registered }: { registered: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <AuthCard
      title="Masuk ke Fintrack"
      description="Lanjutkan catatan pengeluaran harianmu."
      footer={
        <Text textAlign="center" color="fg.muted">
          Belum punya akun?{" "}
          <Text asChild color="teal.fg" fontWeight="medium">
            <Link href="/register">Daftar di sini</Link>
          </Text>
        </Text>
      }
    >
      <form action={formAction}>
        <Stack gap={4}>
          {registered && !state.error && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Title>
                Registrasi berhasil. Cek email kamu jika diminta verifikasi,
                lalu masuk di bawah ini.
              </Alert.Title>
            </Alert.Root>
          )}

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
            <PasswordInput name="password" autoComplete="current-password" required />
          </Field.Root>

          <Button type="submit" loading={pending} colorPalette="teal" mt={2}>
            Masuk
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
