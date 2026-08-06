import { existsSync } from "node:fs";
import { env } from "./env.js";

export type BrowserLike = import("puppeteer-core").Browser;
export type PageLike = import("puppeteer-core").Page;

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
let realUserAgent: string | null = null;

/**
 * Lance un navigateur headless avec des options anti-détection
 * (portage du HeadlessWebDriverFactory de CommuneScraper).
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

      // User-agent réel du Chrome lancé (cohérent → moins suspect qu'un UA dur).
      realUserAgent = await browser.userAgent();

      const pages = await browser.pages();
      for (const page of pages) {
        await page.setUserAgent(realUserAgent);
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        });
      }
      return browser;
    })();
  }
  return browserPromise;
}

/** User-agent réel du navigateur (défini après launch). */
export async function getUserAgent(): Promise<string> {
  if (!realUserAgent) await getBrowser();
  return realUserAgent ?? "";
}

/** Crée (ou réutilise) une page neuve avec le user-agent réel. */
export async function newPage(): Promise<PageLike> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const ua = await getUserAgent();
  if (ua) await page.setUserAgent(ua);
  await page.setViewport({ width: 1920, height: 1080 });
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close().catch(() => undefined);
    browserPromise = null;
    realUserAgent = null;
  }
}
