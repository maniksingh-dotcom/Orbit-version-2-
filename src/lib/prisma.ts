import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

// Versioned cache key — bump this after schema migrations to invalidate the dev singleton
const PRISMA_CACHE_KEY = 'prisma_v2' as const;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  [PRISMA_CACHE_KEY]: PrismaClient | undefined;
};

function createPrismaClient() {
  // Ensure DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse connection string and create pool with explicit config
  // Format: postgresql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL);

  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: decodeURIComponent(url.password), // Decode password in case it has special chars
    // No SSL config needed for Supabase pooler
  });

  // Create Prisma adapter
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma[PRISMA_CACHE_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma[PRISMA_CACHE_KEY] = prisma;
