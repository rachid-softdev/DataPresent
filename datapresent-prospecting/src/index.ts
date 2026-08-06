import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { closeBrowser, getBrowser } from "./browser.js";
import { env } from "./env.js";
import { RunnerLock } from "./lock.js";
import { runAnalyze } from "./stages/analyze.js";
import { runDiscover } from "./stages/discover.js";
import { runEnrich } from "./stages/enrich.js";
import { runFollowup } from "./stages/followup.js";
import { runGenerate } from "./stages/generate.js";
import { runSend } from "./stages/send.js";
import { runStatus } from "./stages/status.js";
import { ensureDataDirs, PATHS, packageRoot } from "./store.js";
import type { IcpConfig } from "./types.js";
import { startWebhookServer } from "./webhook.js";

const USAGE = `Usage:
  pnpm start -- --stage <stage> [--batch N] [--dry-run]
  pnpm start -- --stage webhook
  pnpm start -- --stage status [--list] [--mark <id> --mark-status <status>]

Stages:
  discover   Recherche Google (ICP FR+EN) → nouveaux prospects
  enrich     Emails de contact + contenu site
  analyze    Qualification IA (score 0-100, langue, besoins)
  generate   Rédaction emails personnalisés (Claude)
  send       Envoi automatisé (Resend/SMTP/dev-log) — vérifie opt-out
  followup   Relances dues J+3 / J+6 (max 2)
  status     Résumé / forçage manuel d'un statut
  all        discover → enrich → analyze → generate → send
  webhook    Serveur HTTP events Resend (réponses/rebonds/plaintes)`;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

async function loadIcp(): Promise<IcpConfig> {
  const raw = await readFile(join(packageRoot(), "config", "icp.json"), "utf-8");
  return JSON.parse(raw) as IcpConfig;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const stage = args["stage"] ?? "status";
  const batch = args["batch"] ? parseInt(args["batch"], 10) : undefined;
  const dryRun = args["dry-run"] === "true";

  if (args["help"] === "true") {
    console.log(USAGE);
    return;
  }

  await ensureDataDirs();

  // Webhook : serveur long-running, pas de RunnerLock.
  if (stage === "webhook") {
    const stop = await startWebhookServer();
    const shutdown = async () => {
      await stop();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    return;
  }

  if (stage === "status") {
    await runStatus({
      list: args["list"] === "true",
      markId: args["mark"],
      markStatus: args["mark-status"],
    });
    return;
  }

  const icp = await loadIcp();
  const lock = new RunnerLock(PATHS.lock(), env.RUNNER_HOST);
  if (!(await lock.acquireOrSkip())) return;

  try {
    if (stage === "all") {
      const browser = await getBrowser();
      const page = await browser.newPage();
      try {
        await runDiscover({ icp, browser, page, batch });
        await runEnrich({ page, batch });
      } finally {
        await closeBrowser();
      }
      await runAnalyze({ batch });
      await runGenerate({ batch });
      await runSend({ batch, dryRun });
      return;
    }

    if (stage === "discover") {
      const browser = await getBrowser();
      const page = await browser.newPage();
      try {
        await runDiscover({ icp, browser, page, batch });
      } finally {
        await closeBrowser();
      }
      return;
    }

    if (stage === "enrich") {
      const browser = await getBrowser();
      const page = await browser.newPage();
      try {
        await runEnrich({ page, batch });
      } finally {
        await closeBrowser();
      }
      return;
    }

    switch (stage) {
      case "analyze":
        await runAnalyze({ batch });
        break;
      case "generate":
        await runGenerate({ batch });
        break;
      case "send":
        await runSend({ batch, dryRun });
        break;
      case "followup":
        await runFollowup({ batch, dryRun });
        break;
      default:
        console.error(`[main] unknown stage: ${stage}`);
        console.log(USAGE);
        process.exitCode = 1;
    }
  } finally {
    await lock.release();
  }
}

main().catch((err) => {
  console.error("[main] Fatal error:", err);
  process.exit(1);
});
