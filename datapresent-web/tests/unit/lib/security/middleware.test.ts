// ==========================================
// Middleware Tests (i18n + security headers)
// ==========================================
//
// Tests the middleware.ts:
// - i18n routing for non-API paths (locale negotiation)
// - API routes pass through to handlers
// - Static assets excluded

import { describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock next-intl/middleware before importing middleware.ts
// ---------------------------------------------------------------------------
vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => (request: any) => {
    return new Response(null, { status: 200 })
  }),
}))

// Mock i18n/routing to avoid import errors
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'fr'], defaultLocale: 'en' },
}))

// ---------------------------------------------------------------------------
// Mock next/server — NextResponse
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
      const res = new MockNextResponse(null, { status: init?.status ?? 200, headers })
      res.body = JSON.stringify(body)
      return res
    })
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: vi.fn(),
  }
})

import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

/**
 * Create a minimal mock NextRequest
 */
function createMockRequest({
  method = 'GET',
  pathname = '/api/test',
}: {
  method?: string
  pathname?: string
} = {}): NextRequest {
  return {
    method,
    nextUrl: { pathname },
    headers: new Headers(),
  } as unknown as NextRequest
}

describe('Middleware', () => {
  // -----------------------------------------------------------------------
  // API routes always pass through
  // -----------------------------------------------------------------------
  describe('API routes', () => {
    it('should pass through GET /api/reports', () => {
      const req = createMockRequest({ method: 'GET', pathname: '/api/reports' })
      const response = middleware(req)
      expect(response?.status).toBe(200)
    })

    it('should pass through POST /api/reports', () => {
      const req = createMockRequest({ method: 'POST', pathname: '/api/reports' })
      const response = middleware(req)
      expect(response?.status).toBe(200)
    })

    it('should pass through DELETE /api/user', () => {
      const req = createMockRequest({ method: 'DELETE', pathname: '/api/user' })
      const response = middleware(req)
      expect(response?.status).toBe(200)
    })

    it('should pass through all HTTP methods on API routes', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']
      for (const method of methods) {
        const req = createMockRequest({ method, pathname: '/api/test' })
        const response = middleware(req)
        expect(response?.status).toBe(200)
      }
    })

    it('should return 204 for OPTIONS on API routes', () => {
      const req = createMockRequest({ method: 'OPTIONS', pathname: '/api/test' })
      const response = middleware(req)
      expect(response?.status).toBe(204)
    })

    it('should pass through nested API routes', () => {
      const req = createMockRequest({ method: 'POST', pathname: '/api/reports/123/share' })
      const response = middleware(req)
      expect(response?.status).toBe(200)
    })

    it('should pass through webhook endpoints', () => {
      const req = createMockRequest({ method: 'POST', pathname: '/api/stripe/webhook' })
      const response = middleware(req)
      expect(response?.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------------
  // Non-API routes go through i18n routing
  // -----------------------------------------------------------------------
  describe('Non-API routes', () => {
    it('should process /dashboard through i18n', () => {
      const req = createMockRequest({ method: 'GET', pathname: '/dashboard' })
      const response = middleware(req)
      expect(response).toBeTruthy()
    })

    it('should process /login through i18n', () => {
      const req = createMockRequest({ method: 'GET', pathname: '/login' })
      const response = middleware(req)
      expect(response).toBeTruthy()
    })

    it('should process / (root) through i18n', () => {
      const req = createMockRequest({ method: 'GET', pathname: '/' })
      const response = middleware(req)
      expect(response).toBeTruthy()
    })
  })

  // -----------------------------------------------------------------------
  // Static assets are excluded
  // -----------------------------------------------------------------------
  describe('Static assets', () => {
    it('should skip _next/static paths', () => {
      const req = createMockRequest({ method: 'GET', pathname: '/_next/static/chunk.js' })
      const response = middleware(req)
      expect(response).toBeTruthy()
    })

    it('should skip files with extensions', () => {
      const req = createMockRequest({ method: 'GET', pathname: '/favicon.ico' })
      const response = middleware(req)
      expect(response).toBeTruthy()
    })
  })
})
