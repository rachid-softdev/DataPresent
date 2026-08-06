import { existsSync } from "node:fs";
import { env } from "./env.js";
import { type Ipv4Proxy, startIpv4Proxy } from "./ipv4-proxy.js";

export type BrowserLike = import("puppeteer-core").Browser;
export type PageLike = import("puppeteer-core").Page;

/** User-agent standard Chrome Windows (portage CommuneScraper). */
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Lance le proxy IPv4 local (si PROSPECTING_FORCE_IPV4) et retourne l'arg Chrome. */
async function proxyArg(): Promise<string> {
  ipv4Proxy = await startIpv4Proxy();
  return `--proxy-server=http://127.0.0.1:${ipv4Proxy.port}`;
}

/** Chemins courants de Chrome/Edge installés en local (Windows / macOS / Linux). */
function findInstalledBrowser(): string | undefined {
  const candidates = [
    env.CHROME_PATH,
    process.env.PROGRAMFILES &&
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env["PROGRAMFILES(X86)"] &&
      `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.PROGRAMFILES ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env["PROGRAMFILES(X86)"] ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];

  return candidates.find((p) => existsSync(p));
}

let browserPromise: Promise<BrowserLike> | null = null;
let ipv4Proxy: Ipv4Proxy | null = null;

/**
 * Lance un navigateur headless avec les protections anti-détection de
 * CommuneScraper (HeadlessWebDriverFactory) : UA standard, suppression du
 * flag --enable-automation, navigator.webdriver masqué, lang fr-FR.
 * Chaîne de fallback : CHROME_PATH / Edge / Chrome local → @sparticuz/chromium
 * (binaire Lambda, utilisé en prod Linux / GitHub Actions).
 */
export function getBrowser(): Promise<BrowserLike> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const puppeteer = await import("puppeteer-core");
      let executablePath = findInstalledBrowser();
      if (!executablePath) {
        const chromium = await import("@sparticuz/chromium").catch(() => null);
        if (chromium) {
          executablePath = await chromium.default.executablePath();
        }
      }
      if (!executablePath) {
        throw new Error(
          "No browser found. Set CHROME_PATH to your Chrome/Edge executable or run on Linux with @sparticuz/chromium.",
        );
      }

      const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        // Supprime le flag --enable-automation (signal "Chrome piloté").
        ignoreDefaultArgs: ["--enable-automation"],
        args: [
          ...(env.PROSPECTING_FORCE_IPV4 ? [await proxyArg()] : []),
          `--user-agent=${DEFAULT_USER_AGENT}`,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-background-networking",
          "--disable-sync",
          "--disable-translate",
          "--disable-extensions",
          "--disable-default-apps",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-breakpad",
          "--disable-component-update",
          "--disable-domain-reliability",
          "--disable-blink-features=AutomationControlled",
          "--lang=fr-FR",
          "--window-size=1920,1080",
        ],
        protocolTimeout: 60_000,
      });

      for (const page of await browser.pages()) {
        await preparePage(page, browser);
      }
      return browser;
    })();
  }
  return browserPromise;
}

/**
 * Prépare une page pour le scraping : UA standard (par override CDP, comme
 * CommuneScraper), viewport réaliste et navigator.webdriver masqué.
 * À appeler sur CHAQUE page utilisée pour une recherche (les nouvelles
 * pages n'héritent pas des protections appliquées au launch).
 */
export async function preparePage(page: PageLike, browser?: BrowserLike): Promise<void> {
  try {
    const cdp = await (browser
      ? page.createCDPSession()
      : Promise.reject(new Error("browser required")));
    await cdp.send("Network.setUserAgentOverride", { userAgent: DEFAULT_USER_AGENT });
    await cdp.detach();
  } catch {
    await page.setUserAgent(DEFAULT_USER_AGENT);
  }
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
}

/** Crée une page neuve, préparée pour le scraping. */
export async function newPage(): Promise<PageLike> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await preparePage(page, browser);
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close().catch(() => undefined);
    browserPromise = null;
  }
  if (ipv4Proxy) {
    await ipv4Proxy.close().catch(() => undefined);
    ipv4Proxy = null;
  }
}
