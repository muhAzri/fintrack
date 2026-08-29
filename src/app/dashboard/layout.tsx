import { redirect } from "next/navigation";
import { Box, Button, Container, Flex, Heading, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Box minH="dvh" bg="bg.muted">
      <Box as="header" bg="bg" borderBottomWidth="1px">
        <Container maxW="2xl">
          <Flex align="center" justify="space-between" py={4}>
            <Heading size="md">Fintrack</Heading>
            <Flex align="center" gap={4}>
              <Text fontSize="sm" color="fg.muted" display={{ base: "none", sm: "block" }}>
                {user.email}
              </Text>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  Keluar
                </Button>
              </form>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="2xl" py={8}>
        {children}
      </Container>
    </Box>
  );
}
