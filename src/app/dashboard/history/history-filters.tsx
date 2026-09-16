"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, Input, NativeSelect } from "@chakra-ui/react";
import { CATEGORIES, type ExpenseSource } from "@/lib/types";
import { buildHistoryHref, SORT_OPTIONS, type HistoryFilterState, type SortOption } from "./query";

export function HistoryFilters({
  filters,
  sources,
}: {
  filters: HistoryFilterState;
  sources: ExpenseSource[];
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function apply(overrides: Partial<HistoryFilterState>) {
    router.push(buildHistoryHref({ ...filters, ...overrides }));
  }

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ q: value.trim() || undefined }), 400);
  }

  const hasActiveFilters = Boolean(filters.category || filters.source || filters.q);

  return (
    <Flex gap={3} wrap="wrap" align="center">
      <NativeSelect.Root size="sm" w={{ base: "full", sm: "44" }}>
        <NativeSelect.Field
          value={filters.category ?? ""}
          onChange={(event) => apply({ category: event.target.value || undefined })}
        >
          <option value="">Semua kategori</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <NativeSelect.Root size="sm" w={{ base: "full", sm: "44" }}>
        <NativeSelect.Field
          value={filters.source ?? ""}
          onChange={(event) => apply({ source: event.target.value || undefined })}
        >
          <option value="">Semua sumber</option>
          <option value="none">Tidak terkategorisasi</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <NativeSelect.Root size="sm" w={{ base: "full", sm: "44" }}>
        <NativeSelect.Field
          value={filters.sort ?? "date_desc"}
          onChange={(event) => apply({ sort: event.target.value as SortOption })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <Input
        key={filters.q ?? ""}
        placeholder="Cari catatan..."
        size="sm"
        w={{ base: "full", sm: "48" }}
        defaultValue={filters.q ?? ""}
        onChange={(event) => handleSearchChange(event.target.value)}
      />

      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push(buildHistoryHref({ month: filters.month }))}
        >
          Reset filter
        </Button>
      )}
    </Flex>
  );
}
