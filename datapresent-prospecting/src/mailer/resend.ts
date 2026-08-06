import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { GeneratedEmail } from "../ai/analyze.js";
import { env } from "../env.js";

const isDev = env.NODE_ENV === "development";
const sender = env.PROSPECTING_SENDER || "DataPresent <prospect@datapresent.com>";

let resend: Resend | null = null;
let transporter: nodemailer.Transporter | null = null;

if (!isDev && env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY);
}

if (isDev && env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || "2525", 10),
    secure: false,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

/**
 * Footer légal (RGPD / CAN-SPAM) ajouté à chaque envoi :
 * identification de l'expéditeur + opt-out.
 */
export function buildFooter(optOutUrl: string): string {
  return [
    "",
    "---",
    `DataPresent — transformez vos fichiers de données en présentations professionnelles générées par IA.`,
    `Vous recevez cet email dans le cadre d'une démarche de prospection professionnelle.`,
    `Si vous ne souhaitez plus être contacté : ${optOutUrl}`,
  ].join("\n");
}

export interface SendResult {
  id?: string;
  message?: string;
  provider: "resend" | "smtp" | "dev-log";
}

/**
 * Envoie un email de prospection.
 * - prod : Resend (nécessite RESEND_API_KEY + domaine vérifié)
 * - dev  : SMTP (MailHog) si SMTP_HOST défini, sinon log console
 */
export async function sendProspectingEmail(params: {
  to: string;
  email: GeneratedEmail;
  optOutUrl: string;
}): Promise<SendResult> {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = params.email.body
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const fullBody = `${params.email.body}\n${buildFooter(params.optOutUrl)}`;
  const footerHtml = buildFooter(params.optOutUrl)
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br/>");

  if (isDev && transporter) {
    const info = await transporter.sendMail({
      from: sender,
      to: params.to,
      subject: params.email.subject,
      text: fullBody,
      html: `${html}<br/><p style="color:#666;font-size:12px">${footerHtml}</p>`,
    });
    return { id: info.messageId, provider: "smtp" };
  }
  if (!isDev && resend) {
    const result = await resend.emails.send({
      from: sender,
      to: params.to,
      subject: params.email.subject,
      text: fullBody,
    });
    if (result.error) throw new Error(`Resend error: ${result.error.message}`);
    return { id: result.data?.id, provider: "resend" };
  }
  // Mode dry-run : pas de provider configuré.
  console.log(`[mailer:dev-log] To: ${params.to} | Subject: ${params.email.subject}`);
  console.log(fullBody);
  return { provider: "dev-log" };
}
