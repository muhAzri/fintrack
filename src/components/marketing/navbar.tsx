import Link from "next/link";
import { Button, Container, Flex, Heading } from "@chakra-ui/react";

export function Navbar({ authed }: { authed: boolean }) {
  return (
    <Flex
      as="header"
      borderBottomWidth="1px"
      bg="bg"
      position="sticky"
      top={0}
      zIndex="1"
      pt="env(safe-area-inset-top, 0px)"
    >
      <Container maxW="5xl">
        <Flex align="center" justify="space-between" py={4}>
          <Heading asChild size="md" letterSpacing="tight">
            <Link href="/">Fintrack</Link>
          </Heading>

          <Flex align="center" gap={3}>
            {authed ? (
              <Button asChild size="sm" colorPalette="teal">
                <Link href="/dashboard">Ke Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild size="sm" colorPalette="teal">
                  <Link href="/register">Mulai Gratis</Link>
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Container>
    </Flex>
  );
}
