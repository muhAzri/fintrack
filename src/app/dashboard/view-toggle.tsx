import Link from "next/link";
import { Button, HStack } from "@chakra-ui/react";

export type ExpenseView = "cash" | "realized";

export function ViewToggle({ view, basePath }: { view: ExpenseView; basePath: string }) {
  return (
    <HStack gap={1} bg="bg.muted" p="1" borderRadius="md" w="fit-content">
      <Button
        asChild
        size="xs"
        variant={view === "cash" ? "solid" : "ghost"}
        colorPalette="teal"
      >
        <Link href={`${basePath}?view=cash`}>Uang Keluar</Link>
      </Button>
      <Button
        asChild
        size="xs"
        variant={view === "realized" ? "solid" : "ghost"}
        colorPalette="teal"
      >
        <Link href={`${basePath}?view=realized`}>Realisasi Pakai</Link>
      </Button>
    </HStack>
  );
}
