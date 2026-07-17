// ==========================================
// POST /api/analytics — Client-side event ingestion
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EVENTS, type AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { extractClientIP } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

/** Allowed events that clients can submit */
const CLIENT_ALLOWED_EVENTS = new Set<AnalyticsEvent>([ANALYTICS_EVENTS.REPORT_EXPORTED]);

/** Per-IP rate limiter: max 100 events/hour per IP */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 100;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= RATE_LIMIT_MAX;
}

/** Allowed property value types for client-submitted events */
const ALLOWED_PROP_TYPES = new Set(["string", "number", "boolean"]);

function validateProperties(props: unknown): props is Record<string, unknown> {
  if (props === undefined || props === null) return true;
  if (typeof props !== "object" || Array.isArray(props)) return false;
  for (const [key, value] of Object.entries(props)) {
    if (typeof key !== "string") return false;
    if (value !== null && !ALLOWED_PROP_TYPES.has(typeof value)) return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractClientIP(request) ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = (await request.json()) as {
      event?: string;
      properties?: Record<string, unknown>;
    };

    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json({ error: "Missing required field: event" }, { status: 400 });
    }

    // Narrow from string to AnalyticsEvent union type for type safety
    const eventName = body.event as AnalyticsEvent;
    if (!CLIENT_ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json(
        { error: `Event '${body.event}' is not allowed from clients` },
        { status: 403 },
      );
    }

    if (!validateProperties(body.properties)) {
      return NextResponse.json(
        { error: "Invalid properties: must be flat key-value pairs with primitive values" },
        { status: 400 },
      );
    }

    await trackEvent(eventName, body.properties);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/analytics] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
