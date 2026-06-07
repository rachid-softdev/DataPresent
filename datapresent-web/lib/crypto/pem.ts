import { env } from "@/env";

/**
 * Retrieve the Google Sheets private key, trying:
 * 1. GOOGLE_SHEETS_PRIVATE_KEY_BASE64 (decoded) first
 * 2. Falls back to raw GOOGLE_SHEETS_PRIVATE_KEY
 *
 * Returns null if neither is set.
 */
export function getGoogleSheetsPrivateKey(): string | null {
  if (env.GOOGLE_SHEETS_PRIVATE_KEY_BASE64) {
    try {
      return Buffer.from(env.GOOGLE_SHEETS_PRIVATE_KEY_BASE64, "base64").toString("utf-8");
    } catch {
      console.warn("[pem] Failed to decode GOOGLE_SHEETS_PRIVATE_KEY_BASE64");
      // Fall through to raw key
    }
  }

  return env.GOOGLE_SHEETS_PRIVATE_KEY ?? null;
}
