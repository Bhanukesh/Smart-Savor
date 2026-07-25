import { PrismaClient } from "@prisma/client";

// Single Prisma instance, reused across Next.js hot reloads in dev (avoids exhausting connections).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Prisma returns Decimal objects; the API/UI contract expects plain numbers. */
export const num = (d: unknown): number => Number(d);

/** Route path params (id/itemId) hit Prisma's @db.Uuid columns directly — an unvalidated
 * malformed value throws a raw PrismaClientValidationError (500) instead of a clean 400. */
export const isUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
