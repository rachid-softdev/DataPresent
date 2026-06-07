// ==========================================
// Zero-dependency analytics / event tracking
// ==========================================

import { logger } from "@/lib/logger";

/**
 * Allowed analytics events.
 * Add new events here to keep tracking explicit.
 */
export const ANALYTICS_EVENTS = {
  USER_SIGNUP: "user.signup",
  REPORT_CREATED: "report.created",
  REPORT_EXPORTED: "report.exported",
  SUBSCRIPTION_CHANGED: "subscription.changed",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Keys that will be stripped from analytics properties to avoid PII leakage */
const PII_DENYLIST = new Set(["email", "phone", "ip", "ssn", "password", "token", "secret"]);

/** Strip known PII keys from event properties */
function stripPii(props: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_DENYLIST.has(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * Track a business event.
 *
 * In development: writes a structured JSON line to stdout via the logger.
 * In production: same — prepares for R2 / log drains by emitting structured JSON.
 *
 * Known PII keys (email, phone, ip, etc.) are automatically stripped.
 */
export async function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): Promise<void> {
  const safe = properties ? stripPii(properties) : {};
  const entry = {
    type: "analytics",
    event,
    timestamp: new Date().toISOString(),
    ...safe,
  };

  logger.info("analytics", entry);
}
