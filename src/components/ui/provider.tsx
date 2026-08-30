"use client";

import { Box, ChakraProvider, defaultSystem } from "@chakra-ui/react";

export function Provider(props: React.PropsWithChildren) {
  return (
    <ChakraProvider value={defaultSystem}>
      {/*
        App-wide accent: colorPalette cascades to descendants via a CSS custom
        property, so components can omit colorPalette to inherit "teal" -
        override explicitly only for semantic colors (e.g. colorPalette="red"
        for destructive actions, "green"/"red" for up/down deltas).
        display="contents" keeps this out of the layout box tree.
      */}
      <Box colorPalette="teal" display="contents">
        {props.children}
      </Box>
    </ChakraProvider>
  );
}
