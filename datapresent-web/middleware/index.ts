import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const DEFAULT_ALLOWED_ORIGINS = ["https://datapresent.com", "https://app.datapresent.com"];

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Origin is allowed when:
 * - production (and test): the origin is in the ALLOWED_ORIGINS list
 * - development: the origin is localhost/127.0.0.1 on dev ports 3000/3001
 */
function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (process.env.NODE_ENV === "development") {
    const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isDevPort = url.port === "3000" || url.port === "3001";
    return isLocalHost && isDevPort;
  }

  return getAllowedOrigins().includes(origin);
}

function applyCors(response: NextResponse, origin: string): void {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
}

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname.includes(".");
}

export function middleware(request: NextRequest): NextResponse {
  const requestId = globalThis.crypto.randomUUID();
  // Expose the request id on the request so downstream handlers can read it.
  request.headers.set("x-request-id", requestId);

  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") ?? "";

  // Static assets bypass CORS/i18n processing but still get a request id.
  if (isStaticAsset(pathname)) {
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return response;
  }

  if (pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      if (isAllowedOrigin(origin)) applyCors(response, origin);
      response.headers.set("x-request-id", requestId);
      return response;
    }

    const response = NextResponse.next();
    if (isAllowedOrigin(origin)) applyCors(response, origin);
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Non-API routes go through i18n routing.
  const response = intlMiddleware(request) as NextResponse;
  if (isAllowedOrigin(origin)) applyCors(response, origin);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
