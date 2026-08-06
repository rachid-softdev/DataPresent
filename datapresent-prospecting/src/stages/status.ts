import { loadStore, saveStore } from "../store.js";
import type { ProspectStatus } from "../types.js";

const VALID_STATUSES: ProspectStatus[] = [
  "discovered",
  "enriched",
  "analyzed",
  "qualified",
  "rejected",
  "email_generated",
  "sent",
  "replied",
  "bounced",
  "complained",
  "unsubscribed",
];

/**
 * Étage 7 — status : outil CLI de suivi manuel.
 * - liste tous les prospects (filtrable par statut)
 * - --mark <id> <status> : force un statut (ex. "replied" si la réponse
 *   n'a pas été captée par le webhook).
 */
export async function runStatus(opts: {
  list?: boolean;
  markId?: string;
  markStatus?: string;
}): Promise<void> {
  const store = await loadStore();

  if (opts.markId && opts.markStatus) {
    if (!VALID_STATUSES.includes(opts.markStatus as ProspectStatus)) {
      console.error(
        `[status] invalid status: ${opts.markStatus} (valid: ${VALID_STATUSES.join(", ")})`,
      );
      process.exitCode = 1;
      return;
    }
    const prospect = store.prospects.find((p) => p.id === opts.markId);
    if (!prospect) {
      console.error(`[status] prospect not found: ${opts.markId}`);
      process.exitCode = 1;
      return;
    }
    prospect.status = opts.markStatus as ProspectStatus;
    if (opts.markStatus === "replied") prospect.nextFollowupAt = undefined;
    prospect.updatedAt = new Date().toISOString();
    await saveStore(store);
    console.log(`[status] ${prospect.company} → ${opts.markStatus}`);
    return;
  }

  const byStatus = new Map<ProspectStatus, number>();
  for (const p of store.prospects) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  }
  console.log("[status] Résumé par statut:");
  for (const [status, count] of byStatus) {
    console.log(`  ${status.padEnd(16)} ${count}`);
  }

  if (opts.list) {
    console.log("\n[status] Prospects:");
    for (const p of store.prospects) {
      const score = p.score !== undefined ? ` | score ${p.score}` : "";
      console.log(
        `  ${p.id.slice(0, 8)}  ${p.company.padEnd(30)} ${p.status.padEnd(16)} ${p.contactEmail ?? "-"}${score}`,
      );
    }
  }
}
