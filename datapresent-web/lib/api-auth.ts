// ==========================================
// API Auth - Authenticate requests via API key (Bearer / x-api-key)
// ==========================================

import type { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { hasFeature } from "@/lib/entitlements/feature-gate";

/**
 * Extract an API key from a request's Authorization: Bearer or x-api-key header.
 * Returns null when no key is present.
 */
export function extractApiKey(request: Request | NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match) {
      const key = match[1].trim();
      if (key) return key;
    }
  }

  const headerKey = request.headers.get("x-api-key");
  if (headerKey?.trim()) {
    return headerKey.trim();
  }

  return null;
}

export interface ApiKeyAuthResult {
  orgId: string;
  keyId: string;
}

/**
 * Authenticate a request via its API key.
 *
 * Returns { orgId, keyId } when a valid, non-expired key is presented AND the
 * organization still has the "apiAccess" entitlement (so a key stops working
 * the moment the org's plan no longer grants API access).
 *
 * Returns null when there is no API key or the key is invalid/revoked/expired
 * or the org's plan no longer allows API access.
 */
export async function authenticateApiKey(
  request: Request | NextRequest,
): Promise<ApiKeyAuthResult | null> {
  const key = extractApiKey(request);
  if (!key) return null;

  const result = await validateApiKey(key);
  if (!result.valid || !result.orgId || !result.keyId) {
    return null;
  }

  // Keys only work while the org still has API access on its current plan.
  const hasAccess = await hasFeature(result.orgId, "apiAccess");
  if (!hasAccess) return null;

  return { orgId: result.orgId, keyId: result.keyId };
}
