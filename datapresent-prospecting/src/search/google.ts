import type { Browser, Page } from "puppeteer-core";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: "google" | "bing" | "ddg" | "tavily";
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

/**
 * Extrait l'URL réelle d'une redirection Bing (/ck/a) : le paramètre "u"
 * contient l'URL réelle en base64url (préfixe "a1").
 */
export function unwrapBingUrl(raw: string): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("http") && !raw.includes("bing.com/ck/a")) {
    return raw;
  }
  try {
    const u = new URL(raw);
    if (u.pathname === "/ck/a") {
      const b64 = (u.searchParams.get("u") ?? "").replace(/^a1/, "");
      const decoded = Buffer.from(b64, "base64url").toString("utf-8");
      if (decoded.startsWith("http")) return decoded;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Domaines bloqués (réseaux sociaux, annuaires...) — avec sous-domaines. */
const BLOCKED_HOSTS = [
  "facebook.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "instagram.com",
  "wikipedia.org",
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

const randomDelay = (min: number, max: number) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

/** Extraction Google SERP (anchors + dé-redirection /url?q=). */
async function scrapeGoogle(page: Page, query: string, hl: string): Promise<SearchResult[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=${hl}&num=10`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await randomDelay(2000, 3500);

  const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
  if (looksBlocked(bodyText)) {
    console.warn("[google] anti-bot page detected, switching to Bing");
    return [];
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

  return dedupe(raw, "google");
}

/** Extraction Bing SERP (li.b_algo — URLs directes). */
async function scrapeBing(page: Page, query: string, hl: string): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=${hl}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await randomDelay(1500, 2500);

  const raw = await page.evaluate(() => {
    const out: Array<{ title: string; url: string; snippet: string }> = [];
    for (const li of Array.from(document.querySelectorAll("li.b_algo"))) {
      const a = (li.querySelector("h2 a") ?? li.querySelector("a")) as HTMLAnchorElement | null;
      const href = a?.getAttribute("href");
      const title = a?.textContent?.trim() ?? "";
      if (!href || !title) continue;
      out.push({ title, url: href, snippet: li.textContent?.trim()?.slice(0, 500) ?? "" });
    }
    return out;
  });

  if (raw.length === 0) {
    const title = await page.title();
    const body = await page.evaluate(() => document.body?.innerText ?? "");
    console.warn(
      `[bing] 0 results — title: "${title}" body: "${body.replace(/\s+/g, " ").slice(0, 150)}"`,
    );
  }

  return dedupe(raw, "bing");
}

/** Extraction DuckDuckGo (html.duckduckgo.com — HTML simple, URLs directes). */
async function scrapeDuckDuckGo(page: Page, query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await randomDelay(1500, 2500);

  const raw = await page.evaluate(() => {
    const out: Array<{ title: string; url: string; snippet: string }> = [];
    for (const result of Array.from(document.querySelectorAll(".result"))) {
      const a = result.querySelector(".result__a") as HTMLAnchorElement | null;
      const href = a?.getAttribute("href");
      const title = a?.textContent?.trim() ?? "";
      if (!href || !title) continue;
      const snippet = result.querySelector(".result__snippet")?.textContent?.trim() ?? "";
      out.push({ title, url: href, snippet });
    }
    return out;
  });

  if (raw.length === 0) {
    const title = await page.title();
    console.warn(`[ddg] 0 results — title: "${title}"`);
  }

  return dedupe(raw, "ddg");
}

function dedupe(
  raw: Array<{ title: string; url: string; snippet: string }>,
  source: "google" | "bing" | "ddg",
): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  for (const r of raw) {
    const realUrl =
      source === "google"
        ? unwrapGoogleUrl(r.url)
        : source === "bing"
          ? unwrapBingUrl(r.url)
          : r.url;
    if (!realUrl || !isRelevantResult(realUrl)) continue;
    const key = new URL(realUrl).hostname;
    if (seen.has(key)) continue;
    const cleanTitle = r.title.replace(/\s*›\s*/g, " - ").trim();
    seen.set(key, { title: cleanTitle, url: realUrl, snippet: r.snippet, source });
  }
  return [...seen.values()];
}

/**
 * Recherche Tavily (API conçue pour les agents IA — pas d'anti-bot).
 * Utilisée si TAVILY_API_KEY est configurée, sinon fallback scraping SERP.
 */
export async function tavilySearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 10,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Tavily error ${response.status}: ${await response.text()}`);
  const data = (await response.json()) as {
    results?: Array<{ title: string; url: string; content?: string }>;
  };
  return (data.results ?? [])
    .filter((r) => isRelevantResult(r.url))
    .map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content ?? "",
      source: "tavily" as const,
    }));
}

/**
 * Recherche SERP multi-moteurs : Google → Bing → DuckDuckGo.
 * Même approche que CommuneScraper, avec bascule automatique quand un
 * moteur sert une page anti-bot (trafic exceptionnel, captcha...).
 *
 * Chaque recherche s'exécute dans un CONTEXTE DE NAVIGATEUR ISOLÉ
 * (cookies frais) : les moteurs limitent par session, pas seulement par IP.
 */
export async function searchWeb(
  browser: Browser,
  page: Page,
  query: string,
  language: "fr" | "en",
): Promise<SearchResult[]> {
  const hl = language === "fr" ? "fr" : "en";
  const ua = await browser.userAgent();
  let results = await runWithFreshContext(browser, page, ua, (fresh) =>
    scrapeGoogle(fresh, query, hl),
  );
  if (results.length > 0) return results;

  console.warn("[search] Google blocked or empty — trying Bing");
  results = await runWithFreshContext(browser, page, ua, (fresh) => scrapeBing(fresh, query, hl));
  if (results.length > 0) return results;

  console.warn("[search] Bing blocked or empty — trying DuckDuckGo");
  return runWithFreshContext(browser, page, ua, (fresh) => scrapeDuckDuckGo(fresh, query));
}

type ContextRunner = (page: Page) => Promise<SearchResult[]>;

/**
 * Exécute un scrape dans un contexte de navigateur isolé (cookies neufs),
 * puis ferme le contexte. La page fallback est utilisée si la création
 * d'un contexte échoue (headless sparticuz sur Lambda peut le refuser).
 */
async function runWithFreshContext(
  browser: Browser,
  fallback: Page,
  userAgent: string,
  run: ContextRunner,
): Promise<SearchResult[]> {
  try {
    const context = await browser.createBrowserContext();
    try {
      const fresh = await context.newPage();
      await fresh.setUserAgent(userAgent);
      return await run(fresh);
    } finally {
      await context.close().catch(() => undefined);
    }
  } catch {
    return run(fallback);
  }
}

/** Alias rétro-compatible (utilisé par discover). */
export async function googleSearch(
  browser: Browser,
  page: Page,
  query: string,
  language: "fr" | "en",
): Promise<SearchResult[]> {
  return searchWeb(browser, page, query, language);
}
