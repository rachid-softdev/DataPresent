import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisConnectionAsync } from "@/lib/redis";
import { getGenerateQueue, getExportQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: { database: string; redis: string; queue: string } = {
    database: "unknown",
    redis: "unknown",
    queue: "unknown",
  };

  // Check database
  try {
    await prisma.$queryRaw<unknown>`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    console.error("[ready] Database check failed:", error);
    checks.database = "error";
  }

  // Check Redis
  try {
    const redis = await getRedisConnectionAsync();
    if (redis) {
      await redis.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "unavailable";
    }
  } catch (error) {
    console.error("[ready] Redis check failed:", error);
    checks.redis = "error";
  }

  // Check queue — verify both queues are reachable via Redis
  try {
    const generateQueue = await getGenerateQueue();
    const exportQueue = await getExportQueue();
    // BullMQ queues are backed by Redis; a successful instantiation with
    // the same connection implies the queue system is operational
    await (await generateQueue.client).ping();
    await (await exportQueue.client).ping();
    checks.queue = "ok";
  } catch (error) {
    console.error("[ready] Queue check failed:", error);
    checks.queue = "error";
  }

  const allOk = checks.database === "ok" && checks.redis === "ok" && checks.queue === "ok";

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
