import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config (docs/REQUIREMENTS §9 uses Prisma). The connection URL lives
// here, not in schema.prisma. Prisma 7 no longer auto-loads .env, hence the
// `dotenv/config` import above. The runtime PrismaClient uses the pg driver
// adapter instead (see src/lib/db.ts).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
