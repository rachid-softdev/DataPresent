import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { env } from "./env.js";
import { loadStore, loadSuppressions, saveStore, saveSuppressions } from "./store.js";

const PORT = parseInt(env.PROSPECTING_WEBHOOK_PORT || "8081", 10);

/** Events Resend gérés : rebond, plainte, réponse. */
export type ResendEventType = "email.bounced" | "email.complained" | "email.replied";

export interface ResendEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    email?: string;
    bounce?: { bounce_type?: string };
  };
}

/**
 * Applique un event Resend au store : met à jour le statut du prospect
 * correspondant et alimente la liste de suppression (RGPD).
 */
export async function handleResendEvent(event: ResendEvent): Promise<string | null> {
  if (!["email.bounced", "email.complained", "email.replied"].includes(event.type)) {
    return null;
  }
  const targets = event.data.to ?? (event.data.email ? [event.data.email] : []);
  const store = await loadStore();
  const suppressions = await loadSuppressions();
  let updatedId: string | null = null;

  for (const target of targets) {
    const lower = target.toLowerCase();
    const prospect = store.prospects.find((p) => p.contactEmail?.toLowerCase() === lower);

    if (event.type === "email.bounced" || event.type === "email.complained") {
      if (!suppressions.emails.includes(lower)) suppressions.emails.push(lower);
    }

    if (prospect) {
      switch (event.type) {
        case "email.bounced":
          prospect.status = "bounced";
          break;
        case "email.complained":
          prospect.status = "complained";
          break;
        case "email.replied":
          prospect.status = "replied";
          prospect.nextFollowupAt = undefined;
          break;
      }
      prospect.updatedAt = new Date().toISOString();
      updatedId = prospect.id;
    }
  }

  if (updatedId) await saveStore(store);
  await saveSuppressions(suppressions);
  return updatedId;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) reject(new Error("Body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/**
 * Petit serveur HTTP qui reçoit les webhooks Resend (pattern
 * workers/src/index.ts). Démarre le serveur et retourne la fonction d'arrêt.
 */
export function startWebhookServer(): Promise<() => Promise<void>> {
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/resend-webhook") {
      try {
        const body = await readBody(req);
        const event = JSON.parse(body) as ResendEvent;
        const updatedId = await handleResendEvent(event);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, updatedId }));
      } catch (err) {
        console.error("[webhook] Failed to process event:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy" }));
      return;
    }
    res.writeHead(404);
    res.end("Not Found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[webhook] Listening on 0.0.0.0:${PORT} (POST /resend-webhook)`);
      resolve(async () => {
        await new Promise<void>((r) => server.close(() => r()));
      });
    });
  });
}
