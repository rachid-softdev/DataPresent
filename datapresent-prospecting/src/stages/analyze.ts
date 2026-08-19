import { analyzeProspect } from "../ai/analyze.js";
import { loadStore, saveStore } from "../store.js";

/**
 * Étage 3 — analyze : qualification IA de chaque prospect enrichi
 * (score 0-100, adéquation ICP, langue, besoins, angle de pitch).
 * Statut → "qualified" (score >= 60) ou "rejected".
 */
export async function runAnalyze(opts: { batch?: number }): Promise<number> {
  const store = await loadStore();
  const batch = opts.batch ?? 10;

  const pending = store.prospects
    .filter((p) => p.status === "enriched" && p.contactEmail)
    .slice(0, batch);

  let analyzed = 0;
  for (const prospect of pending) {
    console.log(`[analyze] ${prospect.company} (${prospect.contactEmail})`);
    try {
      const analysis = await analyzeProspect({
        company: prospect.company,
        website: prospect.website,
        country: prospect.country,
        sectorGuess: prospect.notes?.slice(0, 200),
        email: prospect.contactEmail,
        websiteContent: prospect.websiteContent ?? "",
      });

      prospect.score = analysis.score;
      prospect.fit = analysis.fitsIcp;
      prospect.language = analysis.language;
      prospect.sector = analysis.sector;
      prospect.needs = analysis.needs;
      prospect.suggestedAngle = analysis.suggestedAngle;
      prospect.status = analysis.fitsIcp ? "qualified" : "rejected";
      prospect.updatedAt = new Date().toISOString();
      analyzed += 1;
      console.log(
        `  ${analysis.fitsIcp ? "✓ qualified" : "✗ rejected"} — score ${analysis.score}/100 (${analysis.reasoning})`,
      );
    } catch (err) {
      console.error(`[analyze] Groq error for ${prospect.company}:`, err);
    }
  }

  await saveStore(store);
  console.log(`[analyze] ${analyzed}/${pending.length} analyzed`);
  return analyzed;
}
