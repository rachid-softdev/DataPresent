// ==========================================
// Shared crypto utilities for job signing and token management
// ==========================================

import crypto from "node:crypto";

/** Recursively sort keys of an object for deterministic serialization */
function deepSortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepSortKeys);
  }
  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  ) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = deepSortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Sign job data with HMAC-SHA256 for secure queue submissions.
 * The secret is read from environment variable JOB_SIGNING_SECRET.
 */
export function signJobData(
  secret: string,
  data: Record<string, unknown>,
): {
  data: Record<string, unknown>;
  signature: string;
} {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(deepSortKeys(data)))
    .digest("hex");
  return { data, signature };
}

/**
 * Verify a job signature against the expected HMAC-SHA256 hash.
 */
export function verifyJobSignature(
  secret: string,
  data: Record<string, unknown>,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(deepSortKeys(data)))
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Extract and validate signed job data.
 * Returns the clean data without the signature field, plus a validity flag.
 */
export function extractSignedJobData<T extends Record<string, unknown>>(
  secret: string,
  jobData: T & { signature?: string },
): { valid: boolean; cleanData: T } {
  const { signature, ...cleanData } = jobData as unknown as {
    signature?: string;
    [key: string]: unknown;
  };
  if (!signature) return { valid: false, cleanData: cleanData as T };
  const valid = verifyJobSignature(secret, cleanData as Record<string, unknown>, signature);
  return { valid, cleanData: cleanData as T };
}

/**
 * Generate a cryptographically secure random token.
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
