import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { env } from "./env";

const intlMiddleware = createIntlMiddleware(routing);

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * Get the allowed origins from environment or fallback
 */
function getAllowedOrigins(): string[] {
  return env.ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Set CORS headers on the response based on the request origin
 */
function setCorsHeaders(response: NextResponse, requestOrigin: string | null): void {
  if (!requestOrigin) return;

  const allowed = getAllowedOrigins();

  if (process.env.NODE_ENV === "development") {
    const allowedDevOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ];
    if (allowedDevOrigins.includes(requestOrigin)) {
      response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      for (const [key, val] of Object.entries(CORS_HEADERS)) {
        response.headers.set(key, val);
      }
    }
    return;
  }

  if (allowed.includes(requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin);
    for (const [key, val] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, val);
    }
  }
}

/**
 * Combined middleware:
 * - i18n locale routing (non-API routes only)
 * - CORS headers for API routes
 * - Security headers
 *
 * CSRF protection is handled per-route via withCsrfProtection() decorator
 * from lib/security/csrf-middleware.ts for proper cryptographic validation.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // === API Routes: CORS handling ===
  if (pathname.startsWith("/api/")) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      const preflight = new NextResponse(null, { status: 204 });
      setCorsHeaders(preflight, request.headers.get("origin"));
      return preflight;
    }

    // Set CORS headers on actual requests
    const response = NextResponse.next();
    setCorsHeaders(response, request.headers.get("origin"));

    // Security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
  }

  // === Non-API Routes: i18n routing (locale negotiation) ===
  if (
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/_vercel/") &&
    !pathname.match(/\.\w+$/)
  ) {
    return intlMiddleware(request);
  }

  // === Static Assets: pass through ===
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
