/**
 * Extraction et validation d'emails — portage TypeScript de
 * CommuneScraper (EmailExtractor + ValidationKeywords), bilingue FR/EN.
 */

/** NB : PAS de flag /g ici — .test() serait stateful (bug alterné). */
export const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

/** Domaines invalides/jetables à rejeter (placeholders + jetables jetables).
 *  NB: les domaines personnels (gmail, yahoo...) sont gérés à part dans
 *  isValidBusinessEmail — ils restent valides pour un alias business. */
export const INVALID_EMAIL_DOMAINS = [
  "example.com",
  "test.com",
  "domain.com",
  "email.com",
  "wix.com",
  "sentry.io",
  "localhost",
  "sentry.wixpress.com",
  "schema.org",
  "w3.org",
  "yourdomain.com",
  "mailinator.com",
  "yopmail.com",
];

/** Mots-clés FR + EN pour la qualification d'un email (entreprise cible). */
export const BUSINESS_KEYWORDS = [
  // FR
  "mosquee",
  "masjid",
  "mairie",
  "contact",
  "info",
  "accueil",
  "secretariat",
  "admin",
  "service",
  "support",
  "help",
  "assistance",
  "rh",
  "marketing",
  "communication",
  "direction",
  "commercial",
  "vente",
  "compta",
  "hello",
  "bonjour",
  // EN
  "contact",
  "info",
  "hello",
  "sales",
  "marketing",
  "support",
  "admin",
  "office",
  "team",
  "enquiries",
  "inquiries",
  "billing",
  "hr",
  "careers",
  "jobs",
];

export interface EmailValidationResult {
  email: string;
  valid: boolean;
  reason?: string;
}

/** Valide la forme + filtre domaines invalides/jetables. */
export function isWellFormedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return false;
  const domain = lower.split("@")[1];
  return !INVALID_EMAIL_DOMAINS.includes(domain);
}

/**
 * Vérifie si un email est probablement un contact professionnel utile
 * (mot-clé métier dans l'email OU contexte contenant un mot-clé business).
 * Les emails personnels (john.doe@gmail.com) sont rejetés, mais un alias
 * business sur domaine personnel (contact.monagence@gmail.com) est accepté.
 */
export function isValidBusinessEmail(email: string, context = ""): boolean {
  if (!isWellFormedEmail(email)) return false;
  const lower = email.toLowerCase();
  const local = lower.split("@")[0];
  const isPersonalDomain =
    /@(gmail|yahoo|hotmail|outlook|aol|icloud|protonmail|mailinator|yopmail)/.test(lower);

  if (isPersonalDomain && !BUSINESS_KEYWORDS.some((k) => local.includes(k))) return false;
  if (BUSINESS_KEYWORDS.some((k) => local.includes(k))) return true;
  if (context && BUSINESS_KEYWORDS.some((k) => context.toLowerCase().includes(k))) return true;
  return false;
}

/** Extrait tous les emails valides (business) d'un texte. */
export function extractEmails(text: string, context = ""): string[] {
  if (!text) return [];
  const found = text.match(new RegExp(EMAIL_PATTERN.source, "g")) ?? [];
  const valid = found.filter((e) => isValidBusinessEmail(e, context));
  return [...new Set(valid)];
}

/** Priorité de choix quand plusieurs emails sont trouvés. */
const PRIORITY = [
  "contact",
  "info",
  "hello",
  "sales",
  "marketing",
  "direction",
  "admin",
  "rh",
  "hr",
  "support",
  "accueil",
  "secretariat",
];

export function getBestEmail(emails: string[]): string | undefined {
  if (emails.length === 0) return undefined;
  for (const p of PRIORITY) {
    const hit = emails.find((e) => e.toLowerCase().includes(p));
    if (hit) return hit;
  }
  return emails[0];
}
