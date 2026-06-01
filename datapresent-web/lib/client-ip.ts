import { isIP } from "node:net";
import { NextRequest } from "next/server";

/**
 * Validate an IP address string.
 * Rejects falsy values, values with newlines (header injection), and non-IP strings.
 */
function isValidIP(input: string | null): boolean {
  if (!input) return false;
  if (input.includes("\n")) return false;
  return isIP(input) !== 0;
}

/**
 * Extract the client IP address from a NextRequest.
 * Priority: cf-connecting-ip → x-real-ip → first IP from x-forwarded-for
 * Returns null if no valid IP is found.
 */
export function extractClientIP(request: NextRequest): string | null {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  if (!isValidIP(ip)) return null;
  return ip;
}
