"use client";

import { FiTrash2 } from "react-icons/fi";
import { IconButton } from "@chakra-ui/react";
import { deleteExpense } from "./actions";

export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteExpense.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus pengeluaran "${label}"?`)) {
          event.preventDefault();
        }
      }}
    >
      <IconButton
        type="submit"
        size="sm"
        variant="ghost"
        colorPalette="red"
        aria-label="Hapus pengeluaran"
      >
        <FiTrash2 />
      </IconButton>
    </form>
  );
}
