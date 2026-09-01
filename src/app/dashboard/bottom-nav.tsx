"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBarChart2, FiHome, FiPackage, FiPlus, FiSettings } from "react-icons/fi";
import { Box, Flex, Icon, IconButton, Text } from "@chakra-ui/react";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome, exact: true },
  { href: "/dashboard/analytics", label: "Analisis", icon: FiBarChart2, exact: false },
  { href: "/dashboard/stock", label: "Stok", icon: FiPackage, exact: false },
  { href: "/dashboard/settings", label: "Akun", icon: FiSettings, exact: false },
] as const;

export function BottomNav({ onAddClick }: { onAddClick: () => void }) {
  const pathname = usePathname();

  return (
    <Box
      position="fixed"
      bottom={0}
      insetX={0}
      zIndex="docked"
      display={{ base: "block", md: "none" }}
    >
      <IconButton
        aria-label="Tambah pengeluaran"
        onClick={onAddClick}
        colorPalette="teal"
        rounded="full"
        size="lg"
        boxShadow="lg"
        position="absolute"
        top="-1.5rem"
        left="50%"
        transform="translateX(-50%)"
        minW="14"
        minH="14"
        _active={{ transform: "translateX(-50%) scale(0.96)" }}
      >
        <Icon as={FiPlus} boxSize={6} />
      </IconButton>

      <Flex
        as="nav"
        align="center"
        justify="space-around"
        bg="bg"
        borderTopWidth="1px"
        pt={2}
        pb="max(env(safe-area-inset-bottom, 0px), 0.5rem)"
      >
        {TABS.map((tab) => (
          <NavTab key={tab.href} {...tab} active={isActive(pathname, tab)} />
        ))}
      </Flex>
    </Box>
  );
}

function isActive(pathname: string, tab: (typeof TABS)[number]) {
  return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
}

function NavTab({
  href,
  label,
  icon,
  active,
}: (typeof TABS)[number] & { active: boolean }) {
  return (
    <Flex
      asChild
      direction="column"
      align="center"
      justify="center"
      gap={0.5}
      flex={1}
      minH="11"
      color={active ? "teal.fg" : "fg.muted"}
      _active={{ transform: "scale(0.96)" }}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        <Icon as={icon} boxSize={5} />
        <Text fontSize="2xs" fontWeight={active ? "semibold" : "normal"}>
          {label}
        </Text>
      </Link>
    </Flex>
  );
}
