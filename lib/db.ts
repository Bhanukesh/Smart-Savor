import { PrismaClient } from "@prisma/client";

// Single Prisma instance, reused across Next.js hot reloads in dev (avoids exhausting connections).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Prisma returns Decimal objects; the API/UI contract expects plain numbers. */
export const num = (d: unknown): number => Number(d);
