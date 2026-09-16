"use client";

import { FiTrash2 } from "react-icons/fi";
import { IconButton } from "@chakra-ui/react";
import { deleteSource } from "./actions";

export function DeleteSourceButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteSource.bind(null, id)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Hapus sumber "${label}"? Transaksi yang memakai sumber ini akan jadi Tidak Terkategorisasi.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <IconButton type="submit" size="sm" variant="ghost" colorPalette="red" aria-label="Hapus sumber">
        <FiTrash2 />
      </IconButton>
    </form>
  );
}
