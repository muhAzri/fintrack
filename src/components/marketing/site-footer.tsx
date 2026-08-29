import { Container, Flex, Text } from "@chakra-ui/react";

export function SiteFooter() {
  return (
    <Flex as="footer" borderTopWidth="1px" bg="bg">
      <Container maxW="5xl">
        <Flex
          py={6}
          direction={{ base: "column", sm: "row" }}
          gap={2}
          align="center"
          justify="space-between"
        >
          <Text fontSize="sm" color="fg.muted">
            © {new Date().getFullYear()} Fintrack
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Dibuat untuk bangun kebiasaan finansial yang lebih baik.
          </Text>
        </Flex>
      </Container>
    </Flex>
  );
}
