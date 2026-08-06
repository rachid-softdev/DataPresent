import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("../mailer/resend.js", () => ({
  sendProspectingEmail: (...args: unknown[]) => sendMock(...args),
}));

import { runFollowup } from "../stages/followup.js";
import { loadStore, loadSuppressions, saveStore, saveSuppressions } from "../store.js";

let tmp: string;
const oldDir = process.env.PROSPECTING_DATA_DIR;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "prospecting-followup-"));
  process.env.PROSPECTING_DATA_DIR = tmp;
});

afterAll(async () => {
  if (oldDir === undefined) delete process.env.PROSPECTING_DATA_DIR;
  else process.env.PROSPECTING_DATA_DIR = oldDir;
  await rm(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ provider: "dev-log" });
  const store = await loadStore();
  store.prospects = [];
  store.emails = [];
  await saveStore(store);
  await saveSuppressions({ emails: [], domains: [] });
});

function seedSent(followupCount: number, daysAgo: number, email = "contact@acme.fr") {
  return async () => {
    const store = await loadStore();
    const sentAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    store.prospects.push({
      id: `p-${email}`,
      company: "Acme",
      domain: "acme.fr",
      contactEmail: email,
      subject: "Email initial",
      emailBody: "Corps initial",
      status: "sent",
      followupCount,
      sentAt,
      nextFollowupAt: new Date(Date.now() - 3_600_000).toISOString(), // due
      createdAt: sentAt,
      updatedAt: sentAt,
      source: "test",
      language: "en",
    });
    await saveStore(store);
  };
}

describe("runFollowup", () => {
  it("envoie la relance J+3 aux prospects dus", async () => {
    await seedSent(0, 4)();
    const sent = await runFollowup({ batch: 10, dryRun: false });

    expect(sent).toBe(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].email.subject).toBe("Re: Email initial");

    const store = await loadStore();
    expect(store.prospects[0].followupCount).toBe(1);
    expect(store.prospects[0].nextFollowupAt).toBeDefined();
    expect(store.emails).toHaveLength(1);
    expect(store.emails[0].type).toBe("followup1");
  });

  it("n'envoie pas si la relance n'est pas due", async () => {
    await seedSent(0, 1)(); // envoyé il y a 1 jour → pas due
    const store = await loadStore();
    store.prospects[0].nextFollowupAt = new Date(Date.now() + 86_400_000).toISOString();
    await saveStore(store);

    const sent = await runFollowup({ batch: 10 });
    expect(sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("arrête après 2 relances", async () => {
    await seedSent(2, 10)();
    const sent = await runFollowup({ batch: 10 });
    expect(sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("passe en unsubscribed si supprimé (opt-out)", async () => {
    await seedSent(0, 4)();
    await saveSuppressions({ emails: ["contact@acme.fr"], domains: [] });

    const sent = await runFollowup({ batch: 10 });
    expect(sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();

    const store = await loadStore();
    expect(store.prospects[0].status).toBe("unsubscribed");
  });

  it("ne relance pas un prospect qui a répondu", async () => {
    await seedSent(0, 4)();
    const store = await loadStore();
    store.prospects[0].status = "replied";
    store.prospects[0].nextFollowupAt = undefined;
    await saveStore(store);

    const sent = await runFollowup({ batch: 10 });
    expect(sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("respecte le mode dry-run (aucun envoi)", async () => {
    await seedSent(0, 4)();
    const sent = await runFollowup({ batch: 10, dryRun: true });
    expect(sent).toBe(1);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
