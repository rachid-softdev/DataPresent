import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Écriture atomique d'un JSON : écrit dans un fichier temporaire puis
 * os.replace() (renommage atomique). Le lecteur concurrent voit soit
 * l'ancienne version, soit la nouvelle — jamais un fichier à moitié écrit.
 */
export async function atomicSaveJson(data: unknown, filepath: string): Promise<void> {
  const tmp = `${filepath}.tmp`;
  const dir = dirname(filepath);
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmp, filepath);
}

/** Charge un JSON sans jamais lever (retourne null si absent/corrompu). */
export async function loadJsonSafe<T>(filepath: string): Promise<T | null> {
  try {
    const raw = await readFile(filepath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const LOCK_TIMEOUT_HOURS = 2;

/**
 * RunnerLock — portage de CommuneScraper : empêche deux runners (ex. VPS +
 * GitHub Actions) de s'exécuter simultanément sur les mêmes fichiers.
 * acquireOrSkip() retourne true si on peut exécuter (lock libre ou expiré),
 * false si un autre hôte détient un lock valide.
 */
export class RunnerLock {
  private readonly lockPath: string;
  private readonly host: string;

  constructor(lockPath: string, host: string) {
    this.lockPath = lockPath;
    this.host = host;
  }

  async acquireOrSkip(): Promise<boolean> {
    const now = Date.now();
    const existing = await loadJsonSafe<{
      host: string;
      started_at: string;
      expires_at: string;
    }>(this.lockPath);

    if (existing) {
      const expiresAt = new Date(existing.expires_at).getTime();
      const hostLocked = existing.host !== this.host && expiresAt > now;
      if (hostLocked) {
        console.warn(`[lock] Another runner (${existing.host}) is active — skipping`);
        return false;
      }
      if (expiresAt <= now) {
        console.warn(`[lock] Stale lock from ${existing.host} — breaking it`);
      }
    }

    await atomicSaveJson(
      {
        host: this.host,
        started_at: new Date(now).toISOString(),
        expires_at: new Date(now + LOCK_TIMEOUT_HOURS * 3_600_000).toISOString(),
      },
      this.lockPath,
    );
    return true;
  }

  async release(): Promise<void> {
    try {
      await rename(this.lockPath, `${this.lockPath}.released`);
    } catch {
      // Déjà libéré ou absent — pas grave.
    }
  }
}
