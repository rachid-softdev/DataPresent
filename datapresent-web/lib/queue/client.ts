import { Queue } from "bullmq";
import { getRedisConnectionAsync } from "@/lib/redis";

let generateQueueInstance: Queue | null = null;
let exportQueueInstance: Queue | null = null;

/**
 * Get or create the generate queue (lazy singleton).
 * Connection is established on first call, not at module import time.
 */
export async function getGenerateQueue(): Promise<Queue> {
  if (!generateQueueInstance) {
    const conn = await getRedisConnectionAsync();
    if (!conn) throw new Error("Redis connection required for generate queue");
    generateQueueInstance = new Queue("generate", { connection: conn });
  }
  return generateQueueInstance;
}

/**
 * Get or create the export queue (lazy singleton).
 * Connection is established on first call, not at module import time.
 */
export async function getExportQueue(): Promise<Queue> {
  if (!exportQueueInstance) {
    const conn = await getRedisConnectionAsync();
    if (!conn) throw new Error("Redis connection required for export queue");
    exportQueueInstance = new Queue("export", { connection: conn });
  }
  return exportQueueInstance;
}
