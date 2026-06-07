// ==========================================
// PDF Export Worker — Phase 1 Placeholder
//
// Horizon 6 — PDF Service Dédié
// ==========================================
//
// FUTURE IMPLEMENTATION (Phase 2+):
//   1. Move puppeteer-core + @sparticuz/chromium dependencies here
//   2. Import generatePdf from "../exporters/pdf.js"
//   3. Listen on a "pdf-export" queue (or reuse "export" queue with "PDF" format)
//   4. Upload generated PDF buffer to R2
//   5. Update the Export record status to DONE
//
// For now, PDF exports are handled by the existing export.worker.ts
// which calls generatePdf() directly from datapresent-web/lib/exporters/pdf.ts
//
// This file serves as the placeholder for the dedicated PDF service worker.

import { Worker } from "bullmq";
import { getRedisConnectionAsync } from "../redis.js";
import { logger } from "../logger.js";

let workerInstance: Worker | null = null;

/**
 * Get or create the dedicated PDF export worker (placeholder).
 * Currently disabled — PDF exports are handled by the general export worker.
 * Set PDF_DEDICATED_WORKER=1 in the environment to enable.
 */
export async function getPdfWorker(): Promise<Worker | null> {
  if (process.env.PDF_DEDICATED_WORKER !== "1") {
    logger.info("[pdf-worker] Placeholder mode — PDF exports handled by export worker");
    return null;
  }

  if (workerInstance) return workerInstance;

  const conn = await getRedisConnectionAsync();
  if (!conn) throw new Error("Redis connection required for PDF worker");

  workerInstance = new Worker(
    "pdf-export",
    async () => {
      // TODO: Phase 2 — Implement dedicated PDF generation
      throw new Error("Dedicated PDF worker not yet implemented");
    },
    {
      connection: conn,
      removeOnComplete: { count: 200, age: 3600 },
      removeOnFail: { count: 100, age: 86400 },
    },
  );

  logger.info("[pdf-worker] Registered placeholder worker (PDF_DEDICATED_WORKER=1)");

  return workerInstance;
}
