import { NextRequest, NextResponse } from "next/server";
import { validateCsrfToken } from "./csrf";
import { auth } from "@/lib/auth";
import { logSecurityEvent } from "./error-logger";

/**
 * CSRF protection middleware for API routes
 * Use this for POST, PUT, PATCH, DELETE requests
 * @param req - The incoming request
 * @param providedUserId - Optional. If provided, the CSRF token must be bound to this user.
 *                         Pass session.user.id from the route handler to avoid a second auth() call.
 */
export async function withCsrfProtection(
  req: NextRequest,
  providedUserId?: string,
): Promise<NextResponse | null> {
  // Skip CSRF for GET, HEAD, OPTIONS, and health checks
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return null;
  }

  // Skip for webhook endpoints that use their own signature validation
  const pathname = req.nextUrl?.pathname ?? new URL(req.url).pathname;
  if (pathname.includes("/api/stripe/webhook") || pathname.includes("/api/webhook")) {
    return null;
  }

  // Check CSRF token from header
  const csrfToken = req.headers.get("x-csrf-token");
  if (!csrfToken) {
    logSecurityEvent({
      type: "csrf_failure",
      path: pathname,
      details: "Missing CSRF token header",
    });
    return NextResponse.json(
      { error: "CSRF token required. Include X-CSRF-Token header." },
      { status: 403 },
    );
  }

  // Use provided userId if available (avoids double auth() call)
  const userId = providedUserId ?? (await auth())?.user?.id;

  const isValid = validateCsrfToken(csrfToken, userId);
  if (!isValid) {
    logSecurityEvent({
      type: "csrf_failure",
      userId,
      path: pathname,
      details: "Invalid or expired CSRF token",
    });
    return NextResponse.json({ error: "Invalid or expired CSRF token" }, { status: 403 });
  }

  return null;
}
