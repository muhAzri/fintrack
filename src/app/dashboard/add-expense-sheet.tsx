"use client";

import { FiX } from "react-icons/fi";
import { Drawer, IconButton, Portal } from "@chakra-ui/react";
import { ExpenseForm } from "./expense-form";
import type { ExpenseSource, StockItem } from "@/lib/types";

export function AddExpenseSheet({
  open,
  onOpenChange,
  stockItems,
  sources,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  sources: ExpenseSource[];
}) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="bottom"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            borderTopRadius="l3"
            maxH="85dvh"
            pt={2}
            pb="max(env(safe-area-inset-bottom, 0px), 1rem)"
          >
            <Drawer.CloseTrigger asChild position="absolute" top={2} right={2}>
              <IconButton aria-label="Tutup" variant="ghost" size="sm">
                <FiX />
              </IconButton>
            </Drawer.CloseTrigger>
            <Drawer.Body pt={6}>
              <ExpenseForm
                stockItems={stockItems}
                sources={sources}
                onSuccess={() => onOpenChange(false)}
              />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
