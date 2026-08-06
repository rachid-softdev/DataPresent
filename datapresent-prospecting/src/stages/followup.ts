import { randomUUID } from "node:crypto";
import { env } from "../env.js";
import { sendProspectingEmail } from "../mailer/resend.js";
import {
  addEmailRecord,
  computeNextFollowup,
  isSuppressed,
  loadStore,
  loadSuppressions,
  saveStore,
} from "../store.js";
import type { Prospect } from "../types.js";

const optOutUrl = (email: string) =>
  `${env.PROSPECTING_OPTOUT_URL || "https://datapresent.com/unsubscribe"}?email=${encodeURIComponent(email)}`;

/** Corps de relance bilingue (court, sans revente du pitch complet). */
function buildFollowupBody(prospect: Prospect, followup: "followup1" | "followup2"): string {
  const isFr = prospect.language !== "en";
  if (isFr) {
    if (followup === "followup1") {
      return `Bonjour,\n\nJe me permets de revenir vers vous suite à mon email concernant DataPresent — la transformation de vos fichiers de données (Excel, CSV, PDF) en présentations professionnelles générées par IA.\n\nSi vous n'êtes pas le bon interlocuteur, merci de me l'indiquer. Avez-vous eu l'occasion d'y réfléchir ?`;
    }
    return `Bonjour,\n\nDernier message de ma part : si la transformation de vos données en présentations n'est pas une priorité pour le moment, je vous laisse tranquille. Sinon, je serais ravi de vous montrer ce que DataPresent peut faire pour ${prospect.company}.\n\nBonne journée.`;
  }
  if (followup === "followup1") {
    return `Hi,\n\nI'm following up on my previous email about DataPresent — turning your data files (Excel, CSV, PDF) into professional AI-generated presentations in seconds.\n\nIf I'm not the right person, just let me know. Did you have a chance to think about it?`;
  }
  return `Hi,\n\nLast message from me: if turning your data into presentations isn't a priority right now, I'll leave you alone. Otherwise I'd be happy to show you what DataPresent could do for ${prospect.company}.\n\nHave a great day.`;
}

/**
 * Étage 6 — followup : relances dues (J+3 puis J+6, max 2) pour les
 * prospects envoyés sans réponse. Le webhook Resend (bounce/plainte/
 * réponse) passe le prospect en statut terminal et stoppe les relances.
 */
export async function runFollowup(opts: { batch?: number; dryRun?: boolean }): Promise<number> {
  const store = await loadStore();
  const suppressions = await loadSuppressions();
  const batch = opts.batch ?? 10;
  const now = Date.now();

  const due = store.prospects
    .filter(
      (p) =>
        p.status === "sent" &&
        p.nextFollowupAt &&
        new Date(p.nextFollowupAt).getTime() <= now &&
        (p.followupCount ?? 0) < 2,
    )
    .slice(0, batch);

  let sent = 0;
  for (const prospect of due) {
    if (isSuppressed(prospect.contactEmail ?? "", suppressions)) {
      prospect.status = "unsubscribed";
      prospect.updatedAt = new Date().toISOString();
      console.log(`[followup] skipped (suppressed): ${prospect.contactEmail}`);
      continue;
    }

    const followup = prospect.followupCount === 0 ? "followup1" : "followup2";
    const subject = `Re: ${prospect.subject ?? "DataPresent"}`;
    const body = buildFollowupBody(prospect, followup);

    console.log(`[followup] ${prospect.company} → ${prospect.contactEmail} (${followup})`);
    if (opts.dryRun) {
      console.log(`  [dry-run] "${subject}"`);
      sent += 1;
      continue;
    }

    const result = await sendProspectingEmail({
      to: prospect.contactEmail ?? "",
      email: { subject, body },
      optOutUrl: optOutUrl(prospect.contactEmail ?? ""),
    });

    const sentAt = new Date().toISOString();
    prospect.followupCount = (prospect.followupCount ?? 0) + 1;
    prospect.sentAt = sentAt;
    prospect.nextFollowupAt = computeNextFollowup(sentAt, prospect.followupCount);
    prospect.updatedAt = sentAt;

    addEmailRecord(store, {
      id: randomUUID(),
      prospectId: prospect.id,
      to: prospect.contactEmail ?? "",
      subject,
      body,
      type: followup,
      sentAt,
      messageId: result.id,
    });

    sent += 1;
    console.log(`  ✓ sent (${result.provider})`);
  }

  await saveStore(store);
  console.log(`[followup] ${sent}/${due.length} follow-ups sent`);
  return sent;
}
