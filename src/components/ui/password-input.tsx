"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { IconButton, Input, InputGroup, type InputProps } from "@chakra-ui/react";

export function PasswordInput(props: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup
      endElement={
        <IconButton
          type="button"
          size="xs"
          variant="ghost"
          tabIndex={-1}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <FiEyeOff /> : <FiEye />}
        </IconButton>
      }
    >
      <Input {...props} type={visible ? "text" : "password"} />
    </InputGroup>
  );
}
