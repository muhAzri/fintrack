import Link from "next/link";
import { Card, Container, Heading, Stack, Text } from "@chakra-ui/react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Container maxW="sm" py={{ base: 16, md: 24 }}>
      <Stack gap={8}>
        <Stack gap={2} textAlign="center" align="center">
          <Heading asChild size="md" letterSpacing="tight" color="fg.muted">
            <Link href="/">Fintrack</Link>
          </Heading>
          <Heading size="lg" pt={2}>
            {title}
          </Heading>
          <Text color="fg.muted">{description}</Text>
        </Stack>

        <Card.Root variant="outline">
          <Card.Body>{children}</Card.Body>
        </Card.Root>

        {footer}
      </Stack>
    </Container>
  );
}
