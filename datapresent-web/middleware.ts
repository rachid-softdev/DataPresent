import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Get the allowed origins from environment or fallback
 */
function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS || 'https://datapresent.com,https://app.datapresent.com'
  return origins.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Set CORS headers on the response based on the request origin
 */
function setCorsHeaders(response: NextResponse, requestOrigin: string | null): void {
  if (!requestOrigin) return

  const allowed = getAllowedOrigins()
  
  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    return
  }

  // In production, only reflect verified origins
  if (allowed.includes(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
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
  const { pathname } = request.nextUrl

  // === API Routes: CORS handling ===
  if (pathname.startsWith('/api/')) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 })
      setCorsHeaders(preflight, request.headers.get('origin'))
      return preflight
    }

    // Set CORS headers on actual requests
    const response = NextResponse.next()
    setCorsHeaders(response, request.headers.get('origin'))
    return response
  }

  // === Non-API Routes: i18n routing (locale negotiation) ===
  if (
    !pathname.startsWith('/_next/') &&
    !pathname.startsWith('/_vercel/') &&
    !pathname.match(/\.\w+$/)
  ) {
    return intlMiddleware(request)
  }

  // === Static Assets: pass through ===
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
}
