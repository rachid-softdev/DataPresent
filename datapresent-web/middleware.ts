import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Combined middleware:
 * - i18n locale routing (non-API routes only)
 * - Security headers (supplemental — complements next.config.ts headers)
 *
 * CSRF protection is handled per-route via withCsrfProtection() decorator
 * from lib/security/csrf-middleware.ts for proper cryptographic validation.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // === Non-API Routes: i18n routing (locale negotiation) ===
  if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    !pathname.startsWith('/_vercel/') &&
    !pathname.match(/\.\w+$/)
  ) {
    return intlMiddleware(request)
  }

  // === API Routes: pass through to handler (CSRF handled per-route) ===
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
}
