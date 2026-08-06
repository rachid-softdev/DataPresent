import type { Browser, Page } from "puppeteer-core";
import { preparePage } from "../browser.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "google";
}

/** Signatures des pages anti-bot (Google "trafic exceptionnel", captchas...). */
const BLOCK_SIGNATURES = [
  "trafic exceptionnel",
  "unusual traffic",
  "unusual query",
  "not a robot",
  "recaptcha",
  "captcha",
  "enable javascript and cookies",
  "vérifier que c'est bien vous",
];

function looksBlocked(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCK_SIGNATURES.some((s) => lower.includes(s));
}

/**
 * Extrait l'URL réelle d'une URL de redirection Google (/url?q=...) —
 * portage de CommuneScraper (extract_facebook_url généralisé).
 */
export function unwrapGoogleUrl(raw: string): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("http") && !raw.includes("google.com/url")) {
    return raw;
  }
  try {
    const u = new URL(raw);
    if (u.pathname === "/url" && u.searchParams.has("q")) {
      return u.searchParams.get("q") ?? undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Domaines bloqués (réseaux sociaux, dictionnaires, annuaires...). */
const BLOCKED_HOSTS = [
  "facebook.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "instagram.com",
  "wikipedia.org",
  "fr.wikipedia.org",
  "wiktionary.org",
  "cnrtl.fr",
  "larousse.fr",
  "lerobert.com",
  "le-dictionnaire.com",
  "dictionnaire.com",
  "indeed.com",
  "glassdoor.com",
  "yelp.com",
  "trustpilot.com",
  "pinterest.com",
  "tiktok.com",
];

/** Filtre les résultats non pertinents (google.com interne, annuaires, etc.). */
export function isRelevantResult(url: string): boolean {
  if (!url.startsWith("http")) return false;
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  if (host.endsWith("google.com") || host.endsWith("google.fr")) return false;
  if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) return false;
  return true;
}

/**
 * Construit l'URL de recherche Google avec les paramètres régionaux qui
 * contrent la géolocalisation IP (biais local). Exporté pour testabilité.
 */
export function buildGoogleSearchUrl(
  query: string,
  language: "fr" | "en",
  country: string | undefined,
): string {
  const q = encodeURIComponent(query);
  const hl = language === "fr" ? "fr" : "en";
  const countryParam = country ?? (language === "fr" ? "FR" : "US");
  // gl= pays de la recherche, cr= restriction pays (cr=countryFR)
  return `https://www.google.com/search?q=${q}&hl=${hl}&num=10&gl=${countryParam.toLowerCase()}&cr=country${countryParam}`;
}

const randomDelay = (min: number, max: number) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

/** La page affiche la bannière de consentement RGPD ("Before you continue"). */
async function acceptConsentIfPresent(page: Page): Promise<boolean> {
  const hasConsent = await page.evaluate(() =>
    /before you continue|av\.ant de continuer|continuer sur google/i.test(
      document.body?.innerText ?? "",
    ),
  );
  if (!hasConsent) return false;
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const accept = buttons.find((b) =>
      /accept all|tout accepter|j'accepte|agree/i.test(
        b.innerText ?? b.getAttribute("aria-label") ?? "",
      ),
    );
    (accept as HTMLButtonElement | undefined)?.click();
  });
  await randomDelay(2000, 3000);
  return true;
}

/**
 * Extraction Google SERP — portage de la stratégie CommuneScraper :
 * MÊME page/session pour toutes les recherches (cookies Google persistants,
 * aucune rotation de contexte) + délai humain après chargement.
 * Gère la bannière de consentement RGPD et un retry sur page anti-bot
 * (le blocage "trafic exceptionnel" est parfois transitoire).
 */
async function scrapeGoogle(
  page: Page,
  query: string,
  language: "fr" | "en",
  country: string | undefined,
): Promise<SearchResult[]> {
  const url = buildGoogleSearchUrl(query, language, country);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await randomDelay(2000, 3500);

  // Bannière RGPD : accepter puis recharger (le cookie posé débloque la SERP).
  if (await acceptConsentIfPresent(page)) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await randomDelay(2000, 3000);
  }

  let bodyText = await page.evaluate(() => document.body?.innerText ?? "");
  if (looksBlocked(bodyText)) {
    console.warn("[google] anti-bot page detected, retrying once");
    await randomDelay(4000, 6000);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await randomDelay(2000, 3000);
    bodyText = await page.evaluate(() => document.body?.innerText ?? "");
    if (looksBlocked(bodyText)) {
      console.warn("[google] anti-bot page detected after retry");
      return [];
    }
  }

  const raw = await page.evaluate(() => {
    const out: Array<{ title: string; url: string; snippet: string }> = [];
    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.getAttribute("href");
      const title = a.textContent?.trim() ?? "";
      if (!href || !title) continue;
      out.push({ title, url: href, snippet: a.closest("div")?.textContent?.trim() ?? "" });
    }
    return out;
  });

  return dedupe(raw);
}

function dedupe(raw: Array<{ title: string; url: string; snippet: string }>): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  for (const r of raw) {
    const realUrl = unwrapGoogleUrl(r.url);
    if (!realUrl || !isRelevantResult(realUrl)) continue;
    const key = new URL(realUrl).hostname;
    if (seen.has(key)) continue;
    const cleanTitle = r.title.replace(/\s*›\s*/g, " - ").trim();
    seen.set(key, { title: cleanTitle, url: realUrl, snippet: r.snippet, source: "google" });
  }
  return [...seen.values()];
}

/**
 * Recherche Google avec session persistante (approche CommuneScraper) :
 * pas de rotation de contexte — les cookies Google s'accumulent sur la
 * même page, ce qui est le comportement d'un utilisateur réel.
 */
export async function searchWeb(
  browser: Browser,
  page: Page,
  query: string,
  language: "fr" | "en",
  country?: string,
): Promise<SearchResult[]> {
  await preparePage(page, browser);
  return scrapeGoogle(page, query, language, country);
}

/** Alias rétro-compatible (utilisé par discover). */
export async function googleSearch(
  browser: Browser,
  page: Page,
  query: string,
  language: "fr" | "en",
  country?: string,
): Promise<SearchResult[]> {
  return searchWeb(browser, page, query, language, country);
}
