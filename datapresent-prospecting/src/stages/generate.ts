import { writeEmail } from "../ai/analyze.js";
import { loadStore, saveStore } from "../store.js";

/**
 * Étage 4 — generate : rédaction d'un email personnalisé par prospect
 * qualifié (via Groq, dans la langue du prospect). Statut → "email_generated".
 * La génération ne fait aucun envoi (dry-run par nature).
 */
export async function runGenerate(opts: { batch?: number }): Promise<number> {
  const store = await loadStore();
  const batch = opts.batch ?? 10;

  const pending = store.prospects
    .filter((p) => p.status === "qualified" && p.contactEmail)
    .slice(0, batch);

  let generated = 0;
  for (const prospect of pending) {
    if (!prospect.contactEmail) continue;
    console.log(`[generate] ${prospect.company} (${prospect.language ?? "fr"})`);
    try {
      const email = await writeEmail({
        language: prospect.language ?? "fr",
        prospectCompany: prospect.company,
        sector: prospect.sector ?? "unknown",
        country: prospect.country,
        decisionMaker: prospect.decisionMaker ?? "",
        email: prospect.contactEmail,
        score: prospect.score ?? 0,
        needs: prospect.needs ?? [],
        suggestedAngle: prospect.suggestedAngle ?? "",
      });

      prospect.subject = email.subject;
      prospect.emailBody = email.body;
      prospect.status = "email_generated";
      prospect.updatedAt = new Date().toISOString();
      generated += 1;
      console.log(`  ✓ "${email.subject}"`);
    } catch (err) {
      console.error(`[generate] Groq error for ${prospect.company}:`, err);
    }
  }

  await saveStore(store);
  console.log(`[generate] ${generated}/${pending.length} emails generated`);
  return generated;
}
