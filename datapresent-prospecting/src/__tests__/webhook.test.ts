import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadStore, loadSuppressions, saveStore, saveSuppressions } from "../store.js";
import type { Prospect } from "../types.js";
import { handleResendEvent } from "../webhook.js";

let tmp: string;
const oldDir = process.env.PROSPECTING_DATA_DIR;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "prospecting-webhook-"));
  process.env.PROSPECTING_DATA_DIR = tmp;
});

afterAll(async () => {
  if (oldDir === undefined) delete process.env.PROSPECTING_DATA_DIR;
  else process.env.PROSPECTING_DATA_DIR = oldDir;
  await rm(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  // Isolation totale entre tests (le store persiste sur disque).
  const store = await loadStore();
  store.prospects = [];
  await saveStore(store);
  await saveSuppressions({ emails: [], domains: [] });
});

async function seedProspect(status: Prospect["status"], email = "contact@acme.fr") {
  const store = await loadStore();
  store.prospects.push({
    id: "p1",
    company: "Acme",
    domain: "acme.fr",
    contactEmail: email,
    status,
    followupCount: 1,
    nextFollowupAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "test",
  });
  await saveStore(store);
}

describe("handleResendEvent", () => {
  it("marque bounced et ajoute à la liste de suppression", async () => {
    await seedProspect("sent");
    const updatedId = await handleResendEvent({
      type: "email.bounced",
      created_at: new Date().toISOString(),
      data: { to: ["contact@acme.fr"] },
    });
    expect(updatedId).toBe("p1");

    const store = await loadStore();
    expect(store.prospects[0].status).toBe("bounced");

    const suppressions = await loadSuppressions();
    expect(suppressions.emails).toContain("contact@acme.fr");
  });

  it("marque complained (plainte RGPD)", async () => {
    await seedProspect("sent");
    await handleResendEvent({
      type: "email.complained",
      created_at: new Date().toISOString(),
      data: { to: ["contact@acme.fr"] },
    });
    const store = await loadStore();
    expect(store.prospects[0].status).toBe("complained");
  });

  it("marque replied et annule les relances", async () => {
    await seedProspect("sent");
    await handleResendEvent({
      type: "email.replied",
      created_at: new Date().toISOString(),
      data: { to: ["contact@acme.fr"], from: "contact@acme.fr" },
    });
    const store = await loadStore();
    expect(store.prospects[0].status).toBe("replied");
    expect(store.prospects[0].nextFollowupAt).toBeUndefined();
  });

  it("ignore les events non gérés (delivered, opened, clicked)", async () => {
    await seedProspect("sent");
    const updatedId = await handleResendEvent({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { to: ["contact@acme.fr"] },
    });
    expect(updatedId).toBeNull();

    const store = await loadStore();
    expect(store.prospects[0].status).toBe("sent");
  });

  it("ne touche à rien si l'email n'est pas dans le store", async () => {
    const updatedId = await handleResendEvent({
      type: "email.bounced",
      created_at: new Date().toISOString(),
      data: { to: ["inconnu@xyz.fr"] },
    });
    expect(updatedId).toBeNull();
  });
});
