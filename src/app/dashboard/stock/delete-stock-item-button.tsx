"use client";

import { FiTrash2 } from "react-icons/fi";
import { IconButton } from "@chakra-ui/react";
import { deleteStockItem } from "./actions";

export function DeleteStockItemButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteStockItem.bind(null, id)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Hapus barang inventaris "${label}"? Riwayat pemakaiannya juga ikut terhapus.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <IconButton
        type="submit"
        size="sm"
        variant="ghost"
        colorPalette="red"
        aria-label="Hapus barang inventaris"
      >
        <FiTrash2 />
      </IconButton>
    </form>
  );
}
