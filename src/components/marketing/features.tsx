import { FiLock, FiPieChart, FiRepeat, FiZap } from "react-icons/fi";
import { Card, Container, Heading, Icon, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";

const features: { icon: IconType; title: string; description: string }[] = [
  {
    icon: FiZap,
    title: "Catat dalam hitungan detik",
    description:
      "Tinggal isi jumlah dan kategori, langsung tersimpan. Nggak perlu mikir keras tiap habis belanja.",
  },
  {
    icon: FiPieChart,
    title: "Lihat pola pengeluaran",
    description:
      "Total hari ini dan bulan ini selalu kelihatan, biar kamu sadar sebelum kebablasan.",
  },
  {
    icon: FiRepeat,
    title: "Fokus bangun kebiasaan",
    description:
      "Fitur lain menyusul belakangan — sekarang fokus kita cuma satu: konsisten mencatat tiap hari.",
  },
  {
    icon: FiLock,
    title: "Datamu aman & privat",
    description:
      "Setiap catatan cuma bisa diakses akunmu sendiri, diamankan lewat Supabase Auth & Row Level Security.",
  },
];

export function Features() {
  return (
    <Container maxW="5xl" py={{ base: 16, md: 24 }}>
      <Stack gap={12}>
        <Stack gap={3} textAlign="center" align="center" maxW="xl" mx="auto">
          <Heading size={{ base: "2xl", md: "3xl" }}>
            Simpel di awal, biar kamu betah pakai
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Nggak ada laporan rumit atau target yang bikin terbebani. Mulai
            dari yang paling dasar dulu.
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={6}>
          {features.map((feature) => (
            <Card.Root key={feature.title} variant="subtle" h="full">
              <Card.Body>
                <Stack gap={4}>
                  <Icon asChild size="lg" color="teal.fg">
                    <feature.icon />
                  </Icon>
                  <Stack gap={1}>
                    <Card.Title>{feature.title}</Card.Title>
                    <Card.Description>{feature.description}</Card.Description>
                  </Stack>
                </Stack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
