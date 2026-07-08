// PrismaClient singleton on the Prisma 7 `pg` driver adapter.
//
// Prisma 7 no longer reads the connection URL from schema.prisma — the runtime
// client is constructed with a driver adapter (docs/REQUIREMENTS §9, Prisma 7
// note). The DATABASE_URL is loaded from the environment (Next injects .env);
// prisma.config.ts handles the same for the CLI/migrations.
//
// A single client is cached on globalThis so Next's dev hot-reload doesn't open
// a new connection pool on every module reload.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (see .env / .env.example)");
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
