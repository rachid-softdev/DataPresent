// ==========================================
// CSRF Middleware (withCsrfProtection) Tests
// ==========================================
//
// Tests the withCsrfProtection middleware:
// - Missing token returns 403
// - Invalid token returns 403
// - Valid token passes (returns null)
// - Webhook endpoints skipped
// - GET/OPTIONS requests skipped

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock next/server
// ---------------------------------------------------------------------------
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: object, init?: ResponseInit) => {
      const headers = new Headers(init?.headers)
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers,
      })
    }),
  },
  NextRequest: vi.fn(),
}))
// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock crypto (verifyJobSignature)
// ---------------------------------------------------------------------------
vi.mock('@/lib/crypto', () => ({
  verifyJobSignature: vi.fn(),
}))

import { withCsrfProtection } from '@/lib/security/csrf-middleware'
import { generateCsrfToken } from '@/lib/security/csrf'
import { auth } from '@/lib/auth'
import { NextRequest } from 'next/server'

/**
 * Create a minimal mock NextRequest
 */
function createMockRequest({
  method = 'POST',
  pathname = '/api/reports',
  headers = {} as Record<string, string>,
}: {
  method?: string
  pathname?: string
  headers?: Record<string, string>
} = {}): NextRequest {
  const h = new Headers()
  for (const [key, val] of Object.entries(headers)) {
    h.set(key, val)
  }
  return {
    method,
    nextUrl: { pathname },
    headers: h,
  } as unknown as NextRequest
}

describe('withCsrfProtection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Missing / invalid token
  // -----------------------------------------------------------------------
  describe('missing or invalid CSRF token', () => {
    it('should return 403 when no x-csrf-token header is present', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      const req = createMockRequest({ method: 'POST', pathname: '/api/reports' })
      const result = await withCsrfProtection(req)

      expect(result).not.toBeNull()
      expect(result!.status).toBe(403)
      const body = await result!.json()
      expect(body.error).toContain('CSRF token')
    })

    it('should return 403 for an empty token', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        headers: { 'x-csrf-token': '' },
      })
      const result = await withCsrfProtection(req)

      expect(result).not.toBeNull()
      expect(result!.status).toBe(403)
    })

    it('should return 403 for a tampered token', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        headers: { 'x-csrf-token': 'deadbeefdeadbeef:deadbeefdeadbeef:tampered' },
      })
      const result = await withCsrfProtection(req)

      expect(result).not.toBeNull()
      expect(result!.status).toBe(403)
      const body = await result!.json()
      expect(body.error).toContain('Invalid')
    })

    it('should return 403 when token is bound to a different userId', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-actual', email: 'actual@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      // Generate a token bound to a different user
      const token = generateCsrfToken('user-other')

      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        headers: { 'x-csrf-token': token },
      })
      const result = await withCsrfProtection(req)

      expect(result).not.toBeNull()
      expect(result!.status).toBe(403)
      const body = await result!.json()
      expect(body.error).toContain('Invalid')
    })
  })

  // -----------------------------------------------------------------------
  // Valid token
  // -----------------------------------------------------------------------
  describe('valid CSRF token', () => {
    it('should return null when valid token is provided (no session)', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const token = generateCsrfToken()
      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        headers: { 'x-csrf-token': token },
      })
      const result = await withCsrfProtection(req)

      expect(result).toBeNull()
    })

    it('should return null when valid token matches session userId', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      const token = generateCsrfToken('user-123')
      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        headers: { 'x-csrf-token': token },
      })
      const result = await withCsrfProtection(req)

      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Security event logging
  // -----------------------------------------------------------------------
  describe('security event logging', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.mocked(console.warn).mockRestore?.()
    })

    it('should log security event when CSRF token is missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      const req = createMockRequest({ method: 'POST', pathname: '/api/reports' })
      const result = await withCsrfProtection(req)

      // Assert 403
      expect(result).not.toBeNull()
      expect(result!.status).toBe(403)

      // Assert console.warn was called with security event
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        '[Security Event]',
        expect.stringContaining('"type":"csrf_failure"')
      )
      expect(console.warn).toHaveBeenCalledWith(
        '[Security Event]',
        expect.stringContaining('Missing')
      )
    })

    it('should log security event on invalid CSRF token', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })

      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/reports',
        headers: { 'x-csrf-token': 'deadbeefdeadbeef:deadbeefdeadbeef:tampered' },
      })
      const result = await withCsrfProtection(req)

      // Assert 403
      expect(result).not.toBeNull()
      expect(result!.status).toBe(403)

      // Assert console.warn was called with security event
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        '[Security Event]',
        expect.stringContaining('"type":"csrf_failure"')
      )
      expect(console.warn).toHaveBeenCalledWith(
        '[Security Event]',
        expect.stringContaining('Invalid')
      )
    })
  })

  // -----------------------------------------------------------------------
  // Skipped routes
  // -----------------------------------------------------------------------
  describe('skipped requests', () => {
    it('should skip GET requests (return null)', async () => {
      const req = createMockRequest({
        method: 'GET',
        pathname: '/api/reports',
        headers: {}, // no token
      })
      const result = await withCsrfProtection(req)

      expect(result).toBeNull()
    })

    it('should skip OPTIONS requests (return null)', async () => {
      const req = createMockRequest({
        method: 'OPTIONS',
        pathname: '/api/reports',
        headers: {}, // no token
      })
      const result = await withCsrfProtection(req)

      expect(result).toBeNull()
    })

    it('should skip Stripe webhook endpoints (return null)', async () => {
      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/stripe/webhook',
        headers: {}, // no token
      })
      const result = await withCsrfProtection(req)

      expect(result).toBeNull()
    })

    it('should skip generic webhook endpoints (return null)', async () => {
      const req = createMockRequest({
        method: 'POST',
        pathname: '/api/webhook/handle',
        headers: {}, // no token
      })
      const result = await withCsrfProtection(req)

      expect(result).toBeNull()
    })
  })
})
