import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Button, Card, Flex, Heading, HStack, Separator, Stack, Text } from "@chakra-ui/react";
import { ChangePasswordForm } from "./change-password-form";
import { signOut } from "@/lib/actions/auth";

export default function SettingsPage() {
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
        <Heading size="lg">Pengaturan Akun</Heading>
        <Text color="fg.muted">Kelola keamanan akunmu di sini.</Text>
      </Stack>

      <Card.Root variant="outline">
        <Card.Body>
          <Flex align="center" justify="space-between" gap={4} wrap="wrap">
            <Stack gap={1}>
              <Text fontWeight="semibold">Sumber Pengeluaran</Text>
              <Text color="fg.muted" fontSize="sm">
                Kelola rekening atau e-wallet yang kamu pakai untuk mencatat asal pengeluaran.
              </Text>
            </Stack>
            <Button asChild size="sm" variant="outline" colorPalette="teal">
              <Link href="/dashboard/sources">Kelola →</Link>
            </Button>
          </Flex>
        </Card.Body>
      </Card.Root>

      <ChangePasswordForm />

      <Separator />

      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Keluar
        </Button>
      </form>
    </Stack>
  );
}
