import { Box, Container, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";

const steps = [
  {
    number: "1",
    title: "Daftar akun",
    description: "Cukup email dan password, langsung bisa dipakai.",
  },
  {
    number: "2",
    title: "Catat pengeluaran harian",
    description: "Setiap kali keluar uang, buka Fintrack dan catat sebentar.",
  },
  {
    number: "3",
    title: "Lihat kebiasaanmu terbentuk",
    description: "Total harian dan bulanan bikin kamu makin sadar arah uangmu.",
  },
];

export function HowItWorks() {
  return (
    <Box bg="bg.muted">
      <Container maxW="5xl" py={{ base: 16, md: 24 }}>
        <Stack gap={12}>
          <Heading size={{ base: "2xl", md: "3xl" }} textAlign="center">
            Mulai dalam tiga langkah
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
            {steps.map((step) => (
              <Stack key={step.number} gap={3}>
                <Flex
                  align="center"
                  justify="center"
                  boxSize={10}
                  borderRadius="full"
                  bg="teal.solid"
                  color="teal.contrast"
                  fontWeight="bold"
                >
                  {step.number}
                </Flex>
                <Text fontWeight="semibold" fontSize="lg">
                  {step.title}
                </Text>
                <Text color="fg.muted">{step.description}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
