import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest config for the ledger/billing core (docs/REQUIREMENTS §11). Tests run
// in a Node environment — the code under test in src/lib/{money,dates,ledger,
// billing} is plain TypeScript with no DOM. The `@/*` alias mirrors
// tsconfig.json ("@/*" -> "./src/*") so imports match app code.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
