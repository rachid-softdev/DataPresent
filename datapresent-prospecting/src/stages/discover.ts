import { randomUUID } from "node:crypto";
import type { Browser, Page } from "puppeteer-core";
import { googleSearch, type SearchResult } from "../search/google.js";
import { findProspectByDomain, loadStore, saveStore, upsertProspect } from "../store.js";
import type { DataStore, IcpConfig, Prospect } from "../types.js";

/** Normalise un domaine : minuscules, sans www. */
export function normalizeDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Extrait le nom d'entreprise probable depuis un titre de résultat Google. */
export function companyFromTitle(title: string): string {
  const cleaned = title.split(" - ")[0]?.split(" | ")[0]?.split(" : ")[0]?.trim() ?? "";
  return cleaned.replace(/\s*:\s*$/, "").trim();
}

async function addCandidate(
  store: DataStore,
  result: SearchResult,
  language: "fr" | "en",
  country: string,
): Promise<number> {
  const domain = normalizeDomain(result.url);
  if (!domain) return 0;
  if (findProspectByDomain(store, domain)) return 0;

  const prospect: Prospect = {
    id: randomUUID(),
    company: companyFromTitle(result.title) || domain,
    domain,
    website: result.url,
    country,
    language,
    source: "google",
    status: "discovered",
    followupCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: result.snippet.slice(0, 500),
  };
  upsertProspect(store, prospect);
  console.log(`[discover] + ${prospect.company} (${domain})`);
  return 1;
}

/**
 * Étage 1 — discover : à partir de l'ICP (config/icp.json), génère les
 * requêtes Google par marché (FR + EN) et collecte les sociétés candidates.
 * Dédoublonnage par domaine (persistant via store.json).
 * Le pays du marché est transmis au scraping pour forcer la région des
 * moteurs (évite le biais de géolocalisation IP).
 */
export async function runDiscover(opts: {
  icp: IcpConfig;
  browser: Browser;
  page: Page;
  batch?: number;
}): Promise<number> {
  const store = await loadStore();
  const batch = opts.batch ?? opts.icp.batchSize;
  let added = 0;

  let remaining = batch;
  for (const market of opts.icp.markets) {
    if (remaining <= 0) break;
    const perMarket = Math.ceil(batch / opts.icp.markets.length);
    const queries = market.searchQueries.slice(0, perMarket);
    for (const query of queries) {
      if (remaining <= 0) break;
      const country = market.countries[0] ?? (market.language === "fr" ? "FR" : "US");
      console.log(`[discover] ${market.language.toUpperCase()} :: ${query} (${country})`);
      const results = await googleSearch(opts.browser, opts.page, query, market.language, country);
      for (const result of results.slice(0, 4)) {
        if (remaining <= 0) break;
        added += await addCandidate(store, result, market.language, market.countries[0] ?? "");
        remaining -= 1;
      }
      // Délai aléatoire entre requêtes (anti-détection).
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    }
  }

  await saveStore(store);
  console.log(`[discover] ${added} new candidate(s) — total ${store.prospects.length}`);
  return added;
}
