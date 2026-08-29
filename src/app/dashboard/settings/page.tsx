import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { ChangePasswordForm } from "./change-password-form";

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
        >
          <Link href="/dashboard">
            <FiArrowLeft />
            Kembali ke Dashboard
          </Link>
        </HStack>
        <Heading size="lg">Pengaturan Akun</Heading>
        <Text color="fg.muted">Kelola keamanan akunmu di sini.</Text>
      </Stack>

      <ChangePasswordForm />
    </Stack>
  );
}
