"use client";

import { useRouter } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { HStack, IconButton, Input, Text } from "@chakra-ui/react";

function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  monthKey,
  monthLabel,
  disableNext,
}: {
  monthKey: string;
  monthLabel: string;
  disableNext: boolean;
}) {
  const router = useRouter();

  function goTo(key: string) {
    router.push(`/dashboard/history?month=${key}`);
  }

  return (
    <HStack gap={2} justify="space-between">
      <IconButton
        aria-label="Bulan sebelumnya"
        variant="outline"
        size="sm"
        onClick={() => goTo(shiftMonthKey(monthKey, -1))}
      >
        <FiChevronLeft />
      </IconButton>

      <HStack gap={2}>
        <Text fontWeight="semibold" minW="10ch" textAlign="center">
          {monthLabel}
        </Text>
        <Input
          type="month"
          value={monthKey}
          max={currentMonthKey()}
          onChange={(event) => {
            if (event.target.value) goTo(event.target.value);
          }}
          size="sm"
          w="auto"
        />
      </HStack>

      <IconButton
        aria-label="Bulan berikutnya"
        variant="outline"
        size="sm"
        onClick={() => goTo(shiftMonthKey(monthKey, 1))}
        disabled={disableNext}
      >
        <FiChevronRight />
      </IconButton>
    </HStack>
  );
}
