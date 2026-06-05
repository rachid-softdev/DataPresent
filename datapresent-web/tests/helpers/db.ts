import { PrismaClient } from "@prisma/client";

let db: PrismaClient | null = null;

/**
 * Get or create a singleton PrismaClient for integration tests.
 * Connects on first call.
 */
export async function getTestDb(): Promise<PrismaClient> {
  if (!db) {
    db = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            "postgresql://datapresent:test@localhost:5432/datapresent_test",
        },
      },
    });
    await db.$connect();
  }
  return db;
}

/**
 * Truncate all application tables (except _prisma_migrations).
 * Safe to call between test suites for isolation.
 */
export async function truncateAll(client: PrismaClient): Promise<void> {
  const tableNames = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
  `;

  for (const { tablename } of tableNames) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
  }
}

/**
 * Disconnect the PrismaClient.
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.$disconnect();
    db = null;
  }
}
