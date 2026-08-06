import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicSaveJson, loadJsonSafe } from "./lock.js";
import type { DataStore, EmailRecord, Prospect } from "./types.js";

/** Racine du package (datapresent-prospecting/). */
export function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

/** Répertoire de données (surchargeable via PROSPECTING_DATA_DIR pour les tests). */
export function dataDir(): string {
  return process.env.PROSPECTING_DATA_DIR || join(packageRoot(), "data");
}

export const PATHS = {
  inputCsv: () => join(dataDir(), "input", "prospects.csv"),
  store: () => join(dataDir(), "output", "store.json"),
  progress: () => join(dataDir(), "output", "progress", "stage-progress.json"),
  suppression: () => join(dataDir(), "output", "suppressions.json"),
  lock: () => join(dataDir(), "output", "progress", "runner.lock"),
};

function emptyStore(): DataStore {
  return { prospects: [], emails: [], campaigns: [] };
}

/**
 * Store unique JSON (prospects + emails + campagnes) avec écritures atomiques.
 * Remplace les fichiers de progression par étape de CommuneScraper par un
 * stockage central simple, commité en git (pattern blog-posts.json).
 */
export async function loadStore(): Promise<DataStore> {
  const store = await loadJsonSafe<DataStore>(PATHS.store());
  return store ?? emptyStore();
}

export async function saveStore(store: DataStore): Promise<void> {
  await atomicSaveJson(store, PATHS.store());
}

/** Charge la liste de suppression (emails + domaines) — opt-out RGPD. */
export async function loadSuppressions(): Promise<{ emails: string[]; domains: string[] }> {
  return (await loadJsonSafe(PATHS.suppression())) ?? { emails: [], domains: [] };
}

export async function saveSuppressions(suppressions: {
  emails: string[];
  domains: string[];
}): Promise<void> {
  await atomicSaveJson(suppressions, PATHS.suppression());
}

export function isSuppressed(
  email: string,
  suppressions: { emails: string[]; domains: string[] },
): boolean {
  const lower = email.toLowerCase();
  if (suppressions.emails.some((e) => e.toLowerCase() === lower)) return true;
  const domain = lower.split("@")[1];
  return suppressions.domains.includes(domain);
}

export async function ensureDataDirs(): Promise<void> {
  await mkdir(join(dataDir(), "input"), { recursive: true });
  await mkdir(join(dataDir(), "output", "progress"), { recursive: true });
}

/** Recalcule les dates de relance : J+3 puis J+6 (max 2 relances). */
export function computeNextFollowup(sentAt: string, followupCount: number): string | undefined {
  if (followupCount >= 2) return undefined;
  const offsetDays = followupCount === 0 ? 3 : 6;
  return new Date(new Date(sentAt).getTime() + offsetDays * 86_400_000).toISOString();
}

export function upsertProspect(store: DataStore, prospect: Prospect): Prospect {
  const idx = store.prospects.findIndex((p) => p.id === prospect.id);
  if (idx >= 0) {
    store.prospects[idx] = {
      ...store.prospects[idx],
      ...prospect,
      updatedAt: new Date().toISOString(),
    };
    return store.prospects[idx];
  }
  store.prospects.push(prospect);
  return prospect;
}

export function addEmailRecord(store: DataStore, record: EmailRecord): void {
  store.emails.push(record);
}

export function findProspectByDomain(store: DataStore, domain: string): Prospect | undefined {
  return store.prospects.find((p) => p.domain.toLowerCase() === domain.toLowerCase());
}
