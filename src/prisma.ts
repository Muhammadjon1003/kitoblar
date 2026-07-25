import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Self-healing: ensure erp_users table exists
export async function ensureUserTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS erp_users (
        id        TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "fullName" TEXT     NOT NULL,
        username  TEXT      NOT NULL UNIQUE,
        password  TEXT      NOT NULL,
        role      TEXT      NOT NULL DEFAULT 'CASHIER',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('[startup] erp_users table ensured.');
  } catch (err: any) {
    console.warn('[startup] erp_users table check failed (non-fatal):', err.message);
  }
}
