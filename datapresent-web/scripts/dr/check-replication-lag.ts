// ==========================================
// DR: Check PostgreSQL replication lag
// Usage: npx tsx scripts/dr/check-replication-lag.ts
// ==========================================

import { PrismaClient } from "@prisma/client";

interface ReplicationLagResult {
  lagSeconds: number;
  isHealthy: boolean;
  lastChecked: string;
}

/**
 * Check replication lag by querying the standby's replay state.
 * Returns lag in seconds (0 if primary or no replication configured).
 */
async function checkReplicationLag(): Promise<ReplicationLagResult> {
  const prisma = new PrismaClient();
  const lastChecked = new Date().toISOString();

  try {
    // Try to query replication stats — works on standby, returns empty on primary
    const result = await prisma.$queryRaw<Array<{ replay_lag: string | null }>>`
      SELECT
        CASE
          WHEN pg_is_in_recovery() THEN
            COALESCE(
              (SELECT EXTRACT(EPOCH FROM (pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn()))::text),
              '0'
            )
          ELSE '0'
        END AS replay_lag
    `;

    const rawLag = result[0]?.replay_lag ?? "0";
    const lagSeconds = Math.max(0, parseFloat(rawLag));

    // Healthy if lag < 60 seconds (configurable threshold)
    const isHealthy = lagSeconds < 60;

    return { lagSeconds, isHealthy, lastChecked };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DR] Replication lag check failed:", message);
    return { lagSeconds: -1, isHealthy: false, lastChecked };
  } finally {
    await prisma.$disconnect();
  }
}

// Run when executed directly
async function main() {
  const result = await checkReplicationLag();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.isHealthy ? 0 : 1);
}

main().catch((err) => {
  console.error("[DR] Fatal error:", err);
  process.exit(1);
});
