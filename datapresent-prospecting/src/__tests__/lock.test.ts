import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { atomicSaveJson, loadJsonSafe, RunnerLock } from "../lock.js";

let tmp: string;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "prospecting-lock-"));
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("atomicSaveJson / loadJsonSafe", () => {
  it("écrit puis relit un JSON atomiquement", async () => {
    const file = join(tmp, "atomic.json");
    await atomicSaveJson({ a: 1, nested: { b: "x" } }, file);
    const data = await loadJsonSafe<{ a: number }>(file);
    expect(data?.a).toBe(1);
  });

  it("retourne null si le fichier n'existe pas ou est corrompu", async () => {
    expect(await loadJsonSafe(join(tmp, "absent.json"))).toBeNull();

    const bad = join(tmp, "corrompu.json");
    await writeFile(bad, "{pas du json", "utf-8");
    expect(await loadJsonSafe(bad)).toBeNull();
  });
});

describe("RunnerLock", () => {
  it("acquiert un lock libre puis le libère", async () => {
    const lockPath = join(tmp, "runner.lock");
    const lock = new RunnerLock(lockPath, "test");
    expect(await lock.acquireOrSkip()).toBe(true);
    expect(await loadJsonSafe<{ host: string }>(lockPath)).toMatchObject({ host: "test" });
    await lock.release();
  });

  it("refuse si un autre hôte détient un lock valide", async () => {
    const lockPath = join(tmp, "runner2.lock");
    const other = new RunnerLock(lockPath, "vps");
    expect(await other.acquireOrSkip()).toBe(true);

    const me = new RunnerLock(lockPath, "github");
    expect(await me.acquireOrSkip()).toBe(false);
  });

  it("casse un lock expiré", async () => {
    const lockPath = join(tmp, "runner3.lock");
    const expired = new Date(Date.now() - 3 * 3_600_000).toISOString();
    await atomicSaveJson({ host: "vps", started_at: expired, expires_at: expired }, lockPath);

    const me = new RunnerLock(lockPath, "github");
    expect(await me.acquireOrSkip()).toBe(true);
  });

  it("permet au même hôte de ré-acquérir", async () => {
    const lockPath = join(tmp, "runner4.lock");
    const lock = new RunnerLock(lockPath, "same");
    expect(await lock.acquireOrSkip()).toBe(true);
    expect(await lock.acquireOrSkip()).toBe(true);
    await lock.release();
  });
});
