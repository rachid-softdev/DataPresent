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

const optOutUrl = (email: string) =>
  `${env.PROSPECTING_OPTOUT_URL || "https://datapresent.com/unsubscribe"}?email=${encodeURIComponent(email)}`;

/**
 * Étage 5 — send : envoi automatisé des emails générés (Resend en prod,
 * SMTP/log en dev). Respecte la liste de suppression (opt-out, bounce,
 * plainte). Statut → "sent" + planification de la première relance (J+3).
 */
export async function runSend(opts: { batch?: number; dryRun?: boolean }): Promise<number> {
  const store = await loadStore();
  const suppressions = await loadSuppressions();
  const batch = opts.batch ?? 10;

  const pending = store.prospects
    .filter((p) => p.status === "email_generated" && p.contactEmail && p.subject && p.emailBody)
    .slice(0, batch);

  let sent = 0;
  for (const prospect of pending) {
    if (!prospect.contactEmail || !prospect.subject || !prospect.emailBody) continue;
    if (isSuppressed(prospect.contactEmail, suppressions)) {
      console.log(`[send] skipped (suppressed): ${prospect.contactEmail}`);
      prospect.status = "unsubscribed";
      prospect.updatedAt = new Date().toISOString();
      continue;
    }

    console.log(`[send] ${prospect.company} → ${prospect.contactEmail}`);
    if (opts.dryRun) {
      console.log(`  [dry-run] "${prospect.subject}"`);
      sent += 1;
      continue;
    }

    const result = await sendProspectingEmail({
      to: prospect.contactEmail,
      email: { subject: prospect.subject, body: prospect.emailBody },
      optOutUrl: optOutUrl(prospect.contactEmail),
    });

    const sentAt = new Date().toISOString();
    prospect.status = "sent";
    prospect.sentAt = sentAt;
    prospect.followupCount = 0;
    prospect.nextFollowupAt = computeNextFollowup(sentAt, 0);
    prospect.updatedAt = sentAt;

    addEmailRecord(store, {
      id: randomUUID(),
      prospectId: prospect.id,
      to: prospect.contactEmail,
      subject: prospect.subject,
      body: prospect.emailBody,
      type: "initial",
      sentAt,
      messageId: result.id,
    });

    sent += 1;
    console.log(`  ✓ sent (${result.provider}) — relance prévue ${prospect.nextFollowupAt}`);
  }

  await saveStore(store);
  console.log(`[send] ${sent}/${pending.length} sent`);
  return sent;
}
