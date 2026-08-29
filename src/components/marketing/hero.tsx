import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Icon,
  Separator,
  Stack,
  Stat,
  Text,
} from "@chakra-ui/react";

const preview = [
  { category: "Makanan & Minuman", note: "Makan siang di kantor", amount: 32000 },
  { category: "Transportasi", note: "Ojek online", amount: 18000 },
  { category: "Belanja", note: "Galon & sabun", amount: 45000 },
];

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function Hero({ authed }: { authed: boolean }) {
  return (
    <Box bg="bg.muted">
      <Container maxW="5xl" py={{ base: 16, md: 28 }}>
        <Stack gap={16} align="center">
          <Stack gap={6} align="center" textAlign="center" maxW="2xl">
            <Badge colorPalette="teal" size="lg" variant="subtle" borderRadius="full" px={3}>
              Bangun kebiasaan, satu catatan per hari
            </Badge>

            <Heading size={{ base: "3xl", md: "5xl" }} letterSpacing="tight">
              Kenali ke mana uangmu pergi, sebelum akhir bulan mengagetkanmu.
            </Heading>

            <Text fontSize={{ base: "lg", md: "xl" }} color="fg.muted">
              Fintrack bantu kamu mencatat pengeluaran harian secepat mungkin —
              tanpa kategori ribet, tanpa laporan yang bikin pusing. Cuma satu
              tujuan: bikin nyatet jadi kebiasaan.
            </Text>

            <HStack gap={4} pt={2}>
              <Button asChild size="lg" colorPalette="teal">
                <Link href={authed ? "/dashboard" : "/register"}>
                  {authed ? "Ke Dashboard" : "Mulai Gratis"}
                  <Icon asChild>
                    <FiArrowRight />
                  </Icon>
                </Link>
              </Button>
              {!authed && (
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Masuk</Link>
                </Button>
              )}
            </HStack>
          </Stack>

          <Card.Root
            variant="elevated"
            maxW="md"
            w="full"
            boxShadow="lg"
            transform={{ md: "rotate(-1deg)" }}
          >
            <Card.Body>
              <Stack gap={5}>
                <Stat.Root>
                  <Stat.Label>Hari ini</Stat.Label>
                  <Stat.ValueText>{currency.format(95000)}</Stat.ValueText>
                </Stat.Root>

                <Separator />

                <Stack gap={3}>
                  {preview.map((item) => (
                    <HStack key={item.category} justify="space-between" align="start">
                      <Stack gap={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {item.category}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {item.note}
                        </Text>
                      </Stack>
                      <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap">
                        {currency.format(item.amount)}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Container>
    </Box>
  );
}
