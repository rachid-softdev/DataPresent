import { describe, expect, it } from "vitest";
import { buildFooter, sendProspectingEmail } from "../mailer/resend.js";

describe("buildFooter", () => {
  it("identifie l'expéditeur et propose l'opt-out (RGPD)", () => {
    const footer = buildFooter("https://datapresent.com/unsubscribe?email=x%40acme.fr");
    expect(footer).toContain("DataPresent");
    expect(footer).toContain("ne souhaitez plus être contacté");
    expect(footer).toContain("https://datapresent.com/unsubscribe?email=x%40acme.fr");
  });
});

describe("sendProspectingEmail (dev-log)", () => {
  it("retourne le provider dev-log sans réseau quand aucun provider configuré", async () => {
    // NODE_ENV=test + pas de RESEND_API_KEY → branche dev-log (dry-run).
    const result = await sendProspectingEmail({
      to: "contact@acme.fr",
      email: { subject: "Test", body: "Bonjour,\n\nContenu." },
      optOutUrl: "https://datapresent.com/unsubscribe?email=contact%40acme.fr",
    });
    expect(result.provider).toBe("dev-log");
  });
});
