import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

const PRISMA_CACHE_KEY = 'prisma_v2' as const;

const globalForPrisma = globalThis as unknown as {
  [PRISMA_CACHE_KEY]: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');

  const url = new URL(dbUrl);
  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    // Supabase pooler supports SSL; rejectUnauthorized:false avoids cert issues on Lambda
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma: PrismaClient =
  globalForPrisma[PRISMA_CACHE_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma[PRISMA_CACHE_KEY] = prisma;
}
