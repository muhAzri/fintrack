import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// DB-backed integration tests (docs/REQUIREMENTS §11). These require a running
// Postgres (docker-compose) and load DATABASE_URL from .env via dotenv, so they
// live behind `yarn test:db` and use the `.itest.ts` suffix — the default
// `yarn test` glob (*.test.ts) deliberately does NOT match them, keeping the
// unit suite runnable with no database.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    // argon2 hashing makes auth tests slower than pure unit tests.
    testTimeout: 20_000,
  },
});
