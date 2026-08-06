import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("../mailer/resend.js", () => ({
  sendProspectingEmail: (...args: unknown[]) => sendMock(...args),
}));

import { runSend } from "../stages/send.js";
import { loadStore, saveStore, saveSuppressions } from "../store.js";

let tmp: string;
const oldDir = process.env.PROSPECTING_DATA_DIR;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "prospecting-send-"));
  process.env.PROSPECTING_DATA_DIR = tmp;
});

afterAll(async () => {
  if (oldDir === undefined) delete process.env.PROSPECTING_DATA_DIR;
  else process.env.PROSPECTING_DATA_DIR = oldDir;
  await rm(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ id: "resend-1", provider: "resend" });
  const store = await loadStore();
  store.prospects = [];
  store.emails = [];
  await saveStore(store);
  await saveSuppressions({ emails: [], domains: [] });
});

async function seedGenerated(email = "contact@acme.fr") {
  const store = await loadStore();
  store.prospects.push({
    id: `p-${email}`,
    company: "Acme",
    domain: "acme.fr",
    contactEmail: email,
    subject: "Sujet",
    emailBody: "Corps",
    status: "email_generated",
    followupCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "test",
    language: "fr",
  });
  await saveStore(store);
}

describe("runSend", () => {
  it("envoie et planifie la relance J+3", async () => {
    await seedGenerated();
    const sent = await runSend({ batch: 10 });

    expect(sent).toBe(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].optOutUrl).toContain("unsubscribe");

    const store = await loadStore();
    const p = store.prospects[0];
    expect(p.status).toBe("sent");
    expect(p.followupCount).toBe(0);
    expect(p.nextFollowupAt).toBeDefined();
    expect(store.emails).toHaveLength(1);
    expect(store.emails[0].type).toBe("initial");
  });

  it("skip les prospects supprimés (opt-out)", async () => {
    await seedGenerated();
    await saveSuppressions({ emails: ["contact@acme.fr"], domains: [] });

    const sent = await runSend({ batch: 10 });
    expect(sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();

    const store = await loadStore();
    expect(store.prospects[0].status).toBe("unsubscribed");
  });

  it("ne fait aucun envoi en dry-run", async () => {
    await seedGenerated();
    const sent = await runSend({ batch: 10, dryRun: true });
    expect(sent).toBe(1);
    expect(sendMock).not.toHaveBeenCalled();

    const store = await loadStore();
    expect(store.prospects[0].status).toBe("email_generated");
  });

  it("ignore les prospects sans email généré", async () => {
    await seedGenerated();
    const store = await loadStore();
    store.prospects[0].status = "qualified";
    store.prospects[0].emailBody = undefined;
    await saveStore(store);

    const sent = await runSend({ batch: 10 });
    expect(sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
