import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Card, Flex, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { SourceForm } from "./source-form";
import { RenameSourceDialog } from "./rename-source-dialog";
import { DeleteSourceButton } from "./delete-source-button";

export default async function SourcesPage() {
  const supabase = await createClient();

  const { data: sourcesData } = await supabase
    .from("expense_sources")
    .select("id, name")
    .order("name", { ascending: true });

  const sources = sourcesData ?? [];

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
          <Link href="/dashboard/settings">
            <FiArrowLeft />
            Kembali ke Pengaturan
          </Link>
        </HStack>
        <Heading size="lg">Sumber Pengeluaran</Heading>
        <Text color="fg.muted">
          Rekening atau e-wallet yang kamu pakai untuk mencatat asal pengeluaran, misalnya BCA,
          Mandiri, GoPay, atau ShopeePay. Opsional - transaksi tanpa sumber otomatis jadi &quot;Tidak
          Terkategorisasi&quot;.
        </Text>
      </Stack>

      <SourceForm />

      {sources.length === 0 ? (
        <Card.Root variant="subtle">
          <Card.Body textAlign="center" color="fg.muted" py={10}>
            <Text>Belum ada sumber. Tambahkan lewat form di atas.</Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <Stack gap={3}>
          {sources.map((source) => (
            <Card.Root key={source.id} variant="outline">
              <Card.Body>
                <Flex align="center" justify="space-between" gap={4}>
                  <Text fontWeight="semibold">{source.name}</Text>
                  <HStack gap={1}>
                    <RenameSourceDialog source={source} />
                    <DeleteSourceButton id={source.id} label={source.name} />
                  </HStack>
                </Flex>
              </Card.Body>
            </Card.Root>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
