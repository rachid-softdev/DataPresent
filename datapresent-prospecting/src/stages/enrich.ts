import type { Page } from "puppeteer-core";
import { enrichProspect } from "../search/strategies.js";
import { loadStore, saveStore } from "../store.js";
import type { Prospect } from "../types.js";

/**
 * Étage 2 — enrich : pour chaque prospect découvert, recherche l'email de
 * contact (Google Search → Website Search) et capture le contenu du site
 * (utilisé ensuite par l'analyse IA). Statut → "enriched" si email trouvé.
 */
export async function runEnrich(opts: { page: Page; batch?: number }): Promise<number> {
  const store = await loadStore();
  const batch = opts.batch ?? 10;

  const pending = store.prospects
    .filter((p) => p.status === "discovered" || p.status === "enriched")
    .slice(0, batch);

  let enriched = 0;
  for (const prospect of pending) {
    console.log(`[enrich] ${prospect.company} (${prospect.domain})`);
    const result = await enrichProspect(opts.page, prospect);

    if (result.contactEmail) {
      prospect.contactEmail = result.contactEmail;
      prospect.emailSource = result.emailSource;
      prospect.status = "enriched";
      prospect.updatedAt = new Date().toISOString();
      enriched += 1;
      console.log(`  ✓ email: ${result.contactEmail} (via ${result.emailSource})`);
    } else {
      prospect.notes = `${prospect.notes ?? ""}\nNo email found during enrichment`.trim();
      prospect.updatedAt = new Date().toISOString();
      console.log("  ✗ no email found");
    }

    if (result.websiteContent) {
      prospect.websiteContent = result.websiteContent;
    }

    // Délai entre prospects (anti-détection).
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2500));
  }

  await saveStore(store);
  console.log(`[enrich] ${enriched}/${pending.length} enriched`);
  return enriched;
}

/** Liste des prospects sans email trouvé — réessai possible en direct. */
export function prospectsWithoutEmail(prospects: Prospect[]): Prospect[] {
  return prospects.filter((p) => p.status === "discovered");
}
