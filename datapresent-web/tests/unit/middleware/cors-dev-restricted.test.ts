// ==========================================
// CORS Dev Mode Restricted (Fix #3)
// ==========================================
//
// Tests that development mode restricts CORS to localhost origins only:
// - http://localhost:3000, http://127.0.0.1:3000 are allowed
// - Non-localhost origins (e.g. http://localhost:5173, https://evil.com) are blocked
// - Production mode continues to use ALLOWED_ORIGINS check

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

describe('CORS Dev Mode Restricted (Fix #3)', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

  // -----------------------------------------------------------------------
  // Allowed localhost origins
  // -----------------------------------------------------------------------
  describe('allowed localhost origins in dev mode', () => {
    it('should allow http://localhost:3000', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://localhost:3000',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3000'
      )
    })

    it('should allow http://127.0.0.1:3000', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://127.0.0.1:3000',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://127.0.0.1:3000'
      )
    })

    it('should allow http://localhost:3001', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://localhost:3001',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3001'
      )
    })

    it('should allow http://127.0.0.1:3001', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://127.0.0.1:3001',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://127.0.0.1:3001'
      )
    })

    it('should reflect allowed origin with CORS headers on OPTIONS', () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        origin: 'http://localhost:3000',
      })
      const response = middleware(req)
      expect(response!.status).toBe(204)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3000'
      )
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
      expect(response!.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(response!.headers.get('Access-Control-Max-Age')).toBe('86400')
    })
  })

  // -----------------------------------------------------------------------
  // Blocked non-localhost origins
  // -----------------------------------------------------------------------
  describe('blocked non-localhost origins in dev mode', () => {
    it('should block http://localhost:5173 (not in allowed list)', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://localhost:5173',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should block http://localhost:3002 (non-matching port)', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://localhost:3002',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should block http://127.0.0.1:8080 (non-matching port)', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://127.0.0.1:8080',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should block external production origin', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'https://datapresent.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should block evil external origin', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'https://evil-site.com',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should not set any CORS headers for blocked origin on OPTIONS', () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        origin: 'http://localhost:5173',
      })
      const response = middleware(req)
      expect(response!.status).toBe(204)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
      expect(response!.headers.get('Access-Control-Allow-Methods')).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Production mode still enforces ALLOWED_ORIGINS
  // -----------------------------------------------------------------------
  describe('production mode still enforces ALLOWED_ORIGINS', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should allow origin from ALLOWED_ORIGINS in production', () => {
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

    it('should block non-ALLOWED_ORIGINS in production', () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        origin: 'http://localhost:3000',
      })
      const response = middleware(req)
      expect(response!.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })
  })
})
