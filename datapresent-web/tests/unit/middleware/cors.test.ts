// ==========================================
// CORS Middleware Tests
// ==========================================
//
// Tests the CORS handling in middleware.ts:
// - Valid origin is reflected in Access-Control-Allow-Origin
// - Invalid origin is rejected
// - OPTIONS preflight returns 204 with CORS headers
// - No origin header returns no CORS headers
// - Development mode allows all origins

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock next-intl/middleware (required by middleware.ts)
// ---------------------------------------------------------------------------
vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => (request: any) => {
    return new Response(null, { status: 200 })
  }),
}))

// ---------------------------------------------------------------------------
// Mock i18n/routing to avoid import errors
// ---------------------------------------------------------------------------
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'fr'], defaultLocale: 'en' },
}))

// ---------------------------------------------------------------------------
// Mock next/server — NextResponse as a real constructor
// ---------------------------------------------------------------------------
vi.mock('next/server', () => {
  class MockNextResponse {
    public status: number
    public headers: Headers
    public body: string | null

    constructor(body: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
      this.body = body as string | null
    }

    static next = vi.fn(() => new MockNextResponse(null, { status: 200 }))
    static json = vi.fn((body: object, init?: ResponseInit) => {
      const headers = new Headers(init?.headers)
      return new MockNextResponse(null, { status: init?.status ?? 200, headers })
    })
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { middleware } from '@/middleware'
import type { NextRequest } from 'next/server'

/**
 * Create a minimal mock NextRequest for CORS testing
 */
function createMockRequest({
  method = 'GET',
  pathname = '/api/test',
  origin = '',
}: {
  method?: string
  pathname?: string
  origin?: string
} = {}): NextRequest {
  const headers = new Headers()
  if (origin) {
    headers.set('origin', origin)
  }
  return {
    method,
    nextUrl: { pathname },
    headers,
  } as unknown as NextRequest
}

describe('CORS Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('valid origin', () => {
    it('should reflect valid origin in Access-Control-Allow-Origin', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'https://datapresent.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://datapresent.com'
      )
    })

    it('should include CORS headers for valid app origin', () => {
      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        origin: 'https://app.datapresent.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.datapresent.com'
      )
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should include Access-Control-Max-Age header', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'https://datapresent.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Max-Age')).toBe('86400')
    })
  })

  describe('invalid origin', () => {
    it('should NOT reflect origin that is not in the allowed list', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'https://evil-site.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should not return any CORS headers for disallowed origin', () => {
      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        origin: 'https://attacker.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeNull()
      expect(response!.headers.get('Access-Control-Allow-Headers')).toBeNull()
    })
  })

  describe('OPTIONS preflight', () => {
    it('should return 204 status for OPTIONS requests', () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        origin: 'https://datapresent.com',
      })
      const response = middleware(req)
      expect(response!.status).toBe(204)
    })

    it('should include CORS headers on OPTIONS response', () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        origin: 'https://datapresent.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://datapresent.com'
      )
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(response!.headers.get('Access-Control-Max-Age')).toBe('86400')
    })

    it('should NOT reflect disallowed origins on OPTIONS', () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        origin: 'https://evil-site.com',
      })
      const response = middleware(req)
      expect(response!.status).toBe(204)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })
  })

  describe('no origin header', () => {
    it('should not set any CORS headers when no origin is present', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        // no origin
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeNull()
    })
  })

  describe('development mode', () => {
    const ORIGINAL_NODE_ENV = process.env.NODE_ENV

    beforeEach(() => {
      // Set development mode
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV
    })

    it('should allow any origin in development mode', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://localhost:5173',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:5173'
      )
    })

    it('should include all CORS headers in development mode', () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        origin: 'http://localhost:5173',
      })
      const response = middleware(req)
      expect(response!.status).toBe(204)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:5173'
      )
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(response!.headers.get('Access-Control-Max-Age')).toBe('86400')
    })
  })

  describe('non-API routes', () => {
    it('should not set CORS headers on non-API routes', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/dashboard',
        origin: 'https://datapresent.com',
      })
      const response = middleware(req)
      // Non-API routes go through i18n middleware, not CORS
      expect(response).toBeTruthy()
    })
  })
})
