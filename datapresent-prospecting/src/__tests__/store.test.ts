import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addEmailRecord,
  computeNextFollowup,
  findProspectByDomain,
  isSuppressed,
  loadStore,
  saveStore,
  upsertProspect,
} from "../store.js";
import type { Prospect } from "../types.js";

let tmp: string;
const oldDir = process.env.PROSPECTING_DATA_DIR;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "prospecting-store-"));
  process.env.PROSPECTING_DATA_DIR = tmp;
});

afterAll(async () => {
  if (oldDir === undefined) delete process.env.PROSPECTING_DATA_DIR;
  else process.env.PROSPECTING_DATA_DIR = oldDir;
  await rm(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  const store = await loadStore();
  store.prospects = [];
  store.emails = [];
  await saveStore(store);
});

function makeProspect(domain: string): Prospect {
  return {
    id: `id-${domain}`,
    company: domain,
    domain,
    source: "test",
    status: "discovered",
    followupCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("store persistence", () => {
  it("persiste prospects et emails", async () => {
    const store = await loadStore();
    const prospect = makeProspect("acme.fr");
    upsertProspect(store, prospect);
    addEmailRecord(store, {
      id: "e1",
      prospectId: prospect.id,
      to: "contact@acme.fr",
      subject: "Bonjour",
      body: "Test",
      type: "initial",
      sentAt: new Date().toISOString(),
    });
    await saveStore(store);

    const reloaded = await loadStore();
    expect(reloaded.prospects).toHaveLength(1);
    expect(reloaded.emails).toHaveLength(1);
  });

  it("dédoublonne par domaine", async () => {
    const store = await loadStore();
    upsertProspect(store, makeProspect("acme.fr"));
    upsertProspect(store, makeProspect("acme.fr"));
    expect(store.prospects).toHaveLength(1);
    expect(findProspectByDomain(store, "acme.fr")).toBeDefined();
    expect(findProspectByDomain(store, "other.io")).toBeUndefined();
  });
});

describe("computeNextFollowup", () => {
  const sentAt = "2026-08-06T08:00:00.000Z";

  it("planifie J+3 après l'envoi initial", () => {
    const next = computeNextFollowup(sentAt, 0);
    expect(next).toBe("2026-08-09T08:00:00.000Z");
  });

  it("planifie J+6 après la première relance", () => {
    const next = computeNextFollowup(sentAt, 1);
    expect(next).toBe("2026-08-12T08:00:00.000Z");
  });

  it("arrête après 2 relances", () => {
    expect(computeNextFollowup(sentAt, 2)).toBeUndefined();
  });
});

describe("isSuppressed", () => {
  it("supprime par email exact", () => {
    expect(isSuppressed("contact@acme.fr", { emails: ["contact@acme.fr"], domains: [] })).toBe(
      true,
    );
    expect(isSuppressed("contact@acme.fr", { emails: ["CONTACT@ACME.FR"], domains: [] })).toBe(
      true,
    );
    expect(isSuppressed("other@acme.fr", { emails: ["contact@acme.fr"], domains: [] })).toBe(false);
  });

  it("supprime par domaine", () => {
    expect(isSuppressed("x@acme.fr", { emails: [], domains: ["acme.fr"] })).toBe(true);
  });
});
