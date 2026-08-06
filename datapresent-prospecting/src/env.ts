import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Requis uniquement pour les étages analyze/generate (check au runtime)
  ANTHROPIC_API_KEY: z.string().min(8).optional(),

  // Email (prod): domaine vérifié Resend — ex: "DataPresent <prospect@datapresent.com>"
  RESEND_API_KEY: z.string().optional(),
  PROSPECTING_SENDER: z.string().optional(),

  // Email (dev): SMTP (MailHog) ou log console si absent
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Navigateur: chemin explicite Chrome/Edge (Windows dev). Si absent,
  // chaîne de fallback Edge → Chrome → @sparticuz/chromium (Linux/prod).
  CHROME_PATH: z.string().optional(),

  // Recherche fiable (recommandé) : Tavily — https://tavily.com (free tier).
  // Si absent, le pipeline retombe sur le scraping SERP Google→Bing→DDG.
  TAVILY_API_KEY: z.string().optional(),

  // Webhook Resend (détection réponses / rebonds)
  PROSPECTING_WEBHOOK_PORT: z.string().optional(),

  // URL d'opt-out (RGPD) — ?email= est ajouté automatiquement
  PROSPECTING_OPTOUT_URL: z.string().optional(),

  // RunnerLock: hôte d'exécution (github par défaut)
  RUNNER_HOST: z.string().default("github"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid datapresent-prospecting environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
