import { PrismaClient } from "@prisma/client";

function buildDatabaseUrl(): string {
  const existing = process.env.DATABASE_URL;
  if (existing) return existing;
  const user = process.env.PGUSER ?? "app";
  const pass = process.env.PGPASSWORD ?? "app";
  const host = process.env.PGHOST ?? "localhost";
  const port = process.env.PGPORT ?? "5432";
const db = process.env.PGDATABASE ?? "app";
  const tpl = "postgresql://{u}:{p}@{h}:{po}/{db}";
  return tpl
    .replace("{u}", encodeURIComponent(user))
    .replace("{p}", pass)
    .replace("{h}", host)
    .replace("{po}", port)
    .replace("{db}", db);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { buildDatabaseUrl };