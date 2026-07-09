// PrismaClient singleton on the Prisma 7 `pg` driver adapter.
//
// Prisma 7 no longer reads the connection URL from schema.prisma — the runtime
// client is constructed with a driver adapter (docs/REQUIREMENTS §9, Prisma 7
// note). The DATABASE_URL is loaded from the environment (Next injects .env);
// prisma.config.ts handles the same for the CLI/migrations.
//
// A single client is cached on globalThis in every environment so that neither
// Next's dev hot-reload nor a re-evaluated module inside a warm serverless
// instance opens a second connection pool. On Vercel each warm function reuses
// this one pool across navigations instead of paying TCP+TLS setup every time.
//
// PERF NOTE: for serverless, DATABASE_URL should point at a *pooler* endpoint
// (Supabase pooler :6543, Neon pooled host, or PgBouncer) — a direct Postgres
// connection re-handshakes on every cold start and can exhaust `max_connections`
// under concurrency. The pool sizing below assumes that.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (see .env / .env.example)");
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    // Keep each instance's pool small — many concurrent serverless instances
    // each hold their own pool, so a large `max` multiplies into the DB.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    // Keep warm connections around for reuse between requests, but reap idle
    // ones so we don't pin connections in a long-lived instance.
    idleTimeoutMillis: 30_000,
    // Fail fast instead of hanging a page render if the pool is saturated.
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
