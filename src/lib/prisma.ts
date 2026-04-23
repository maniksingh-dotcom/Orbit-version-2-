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
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const url = new URL(dbUrl);

  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Lazy singleton — only instantiated when first accessed
let _prisma: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (globalForPrisma[PRISMA_CACHE_KEY]) return globalForPrisma[PRISMA_CACHE_KEY]!;
  if (_prisma) return _prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma[PRISMA_CACHE_KEY] = client;
  } else {
    _prisma = client;
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
