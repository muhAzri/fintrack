"use client";

import { useState } from "react";
import Link from "next/link";
import { FiBarChart2, FiPackage, FiSettings } from "react-icons/fi";
import { Box, Container, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { BottomNav } from "./bottom-nav";
import { AddExpenseSheet } from "./add-expense-sheet";
import type { ExpenseSource, StockItem } from "@/lib/types";

export function DashboardShell({
  userEmail,
  stockItems,
  sources,
  children,
}: {
  userEmail: string;
  stockItems: StockItem[];
  sources: ExpenseSource[];
  children: React.ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Box minH="dvh" bg="bg.muted">
      <Box
        as="header"
        bg="bg"
        borderBottomWidth="1px"
        position="sticky"
        top={0}
        zIndex="docked"
        pt="env(safe-area-inset-top, 0px)"
      >
        <Container maxW="2xl">
          <Flex align="center" justify="space-between" py={{ base: 3, md: 4 }}>
            <Heading size="md">Fintrack</Heading>
            <Flex align="center" gap={4}>
              <Text fontSize="sm" color="fg.muted" display={{ base: "none", md: "block" }}>
                {userEmail}
              </Text>
              <IconButton
                asChild
                variant="ghost"
                size="sm"
                aria-label="Analisis"
                display={{ base: "none", md: "inline-flex" }}
              >
                <Link href="/dashboard/analytics">
                  <FiBarChart2 />
                </Link>
              </IconButton>
              <IconButton
                asChild
                variant="ghost"
                size="sm"
                aria-label="Stok barang"
                display={{ base: "none", md: "inline-flex" }}
              >
                <Link href="/dashboard/stock">
                  <FiPackage />
                </Link>
              </IconButton>
              <IconButton
                asChild
                variant="ghost"
                size="sm"
                aria-label="Pengaturan akun"
                display={{ base: "none", md: "inline-flex" }}
              >
                <Link href="/dashboard/settings">
                  <FiSettings />
                </Link>
              </IconButton>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="2xl" pt={8} pb={{ base: 24, md: 8 }}>
        {children}
      </Container>

      <BottomNav onAddClick={() => setAddOpen(true)} />
      <AddExpenseSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        stockItems={stockItems}
        sources={sources}
      />
    </Box>
  );
}
