import type { Page } from "puppeteer-core";
import { extractEmails, getBestEmail } from "../extraction/emails.js";
import type { Prospect } from "../types.js";

export interface EnrichmentResult {
  contactEmail?: string;
  emailSource?: string;
  decisionMaker?: string;
  websiteContent?: string;
}

/**
 * Stratégie de recherche d'email — portage du pattern
 * EmailSearchStrategy de CommuneScraper.
 */
export interface EmailSearchStrategy {
  name: string;
  search(page: Page, prospect: Prospect): Promise<string | undefined>;
}

/** Étape 1 : recherche Google "société contact email". */
export class GoogleSearchStrategy implements EmailSearchStrategy {
  readonly name = "google";

  async search(page: Page, prospect: Prospect): Promise<string | undefined> {
    const query = `${prospect.company} contact email`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=${prospect.language ?? "fr"}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));

    const text = await page.evaluate(() => document.body.innerText);
    const emails = extractEmails(text, query);
    return getBestEmail(emails);
  }
}

/** Étape 2 : visite du site web de l'entreprise. */
export class WebsiteSearchStrategy implements EmailSearchStrategy {
  readonly name = "website";

  async search(page: Page, prospect: Prospect): Promise<string | undefined> {
    if (!prospect.website) return undefined;
    try {
      await page.goto(prospect.website, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));

      const { text, html } = await page.evaluate(() => ({
        text: document.body?.innerText ?? "",
        html: document.documentElement?.outerHTML ?? "",
      }));

      const emails = extractEmails(`${text} ${html}`, prospect.company);
      return getBestEmail(emails);
    } catch {
      return undefined;
    }
  }
}

/**
 * Enrichit un prospect : recherche de l'email via les stratégies
 * Google Search → Website Search, et capture le contenu du site
 * (utilisé ensuite par l'analyse IA).
 */
export async function enrichProspect(
  page: Page,
  prospect: Prospect,
  strategies: EmailSearchStrategy[] = [new GoogleSearchStrategy(), new WebsiteSearchStrategy()],
): Promise<EnrichmentResult> {
  let contactEmail: string | undefined;
  let emailSource: string | undefined;

  for (const strategy of strategies) {
    if (contactEmail) break;
    const email = await strategy.search(page, prospect);
    if (email) {
      contactEmail = email;
      emailSource = strategy.name;
    }
  }

  let websiteContent = "";
  if (prospect.website) {
    try {
      await page.goto(prospect.website, { waitUntil: "domcontentloaded", timeout: 30_000 });
      websiteContent = (await page.evaluate(() => document.body?.innerText ?? "")).slice(0, 3000);
    } catch {
      websiteContent = "";
    }
  }

  return { contactEmail, emailSource, websiteContent };
}
