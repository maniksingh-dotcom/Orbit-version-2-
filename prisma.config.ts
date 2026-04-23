import { defineConfig } from "prisma/config";

// Using Supabase Session Mode Pooler for migrations (port 5432)
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "postgresql://postgres.ctxotutiomtaflvhrqxe:Maniksingh100@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres",
  },
});
