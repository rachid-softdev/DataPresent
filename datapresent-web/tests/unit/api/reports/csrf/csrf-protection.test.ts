// ==========================================
// Reports Route CSRF Protection (Fix #2)
// ==========================================
//
// Tests that DELETE on /api/reports/[id] enforces CSRF:
// - DELETE without CSRF token returns 403
// - DELETE with valid CSRF token passes through
// - The withCsrfProtection() guard is called before auth
//
// The CSRF middleware itself is tested in lib/security/csrf-middleware.test.ts.
// These tests verify route-level integration for the reports DELETE handler.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockWithCsrfProtection = vi.hoisted(() => vi.fn())
const mockAuth = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  report: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockUnauthorized = vi.hoisted(() => vi.fn())
const mockForbidden = vi.hoisted(() => vi.fn())
const mockNotFound = vi.hoisted(() => vi.fn())

vi.mock('@/lib/security', () => ({
  withCsrfProtection: mockWithCsrfProtection,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/errors', () => ({
  unauthorized: mockUnauthorized,
  forbidden: mockForbidden,
  notFound: mockNotFound,
}))

// State holders for NextResponse.json
let mockJsonStatus: number | undefined
let mockJsonBody: unknown

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      mockJsonBody = body
      mockJsonStatus = (init as { status?: number })?.status ?? 200
      return {
        status: mockJsonStatus,
        body,
        json: async () => body,
      }
    }),
  },
  NextRequest: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import the module under test (after mocks are set up)
// ---------------------------------------------------------------------------
import { DELETE } from '@/app/[locale]/api/reports/[id]/route'

/**
 * Create a minimal NextRequest-like object for testing
 */
function createRequest({
  method = 'DELETE',
  headers = {},
}: {
  method?: string
  headers?: Record<string, string>
} = {}): Request {
  const h = new Headers({ 'Content-Type': 'application/json', ...headers })
  return new Request('http://localhost:3000/api/reports/report-123', {
    method,
    headers: h,
  })
}

describe('Reports Route CSRF Protection (Fix #2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJsonStatus = undefined
    mockJsonBody = undefined

    // Default error responses
    mockUnauthorized.mockReturnValue(
      new Response(JSON.stringify({ error: 'errors.auth.unauthorized' }), { status: 401 })
    )
    mockForbidden.mockReturnValue(
      new Response(JSON.stringify({ error: 'errors.auth.forbidden' }), { status: 403 })
    )
    mockNotFound.mockReturnValue(
      new Response(JSON.stringify({ error: 'errors.resource.notFound' }), { status: 404 })
    )
  })

  // -----------------------------------------------------------------------
  // CSRF protection on DELETE
  // -----------------------------------------------------------------------
  describe('DELETE — CSRF protection', () => {
    it('should return 403 when CSRF check fails on DELETE', async () => {
      // Arrange: CSRF middleware returns a 403 response
      const csrfResponse = new Response(
        JSON.stringify({ error: 'CSRF token required' }),
        { status: 403 }
      )
      mockWithCsrfProtection.mockResolvedValue(csrfResponse)

      // Act
      const req = createRequest({ method: 'DELETE' })
      const result = await DELETE(req, { params: Promise.resolve({ id: 'report-123' }) })

      // Assert
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce()
      expect(result.status).toBe(403)
      const data = await result.json()
      expect(data.error).toContain('CSRF token')
      // Must not proceed to auth or DB
      expect(mockAuth).not.toHaveBeenCalled()
      expect(mockPrisma.report.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.report.delete).not.toHaveBeenCalled()
    })

    it('should call withCsrfProtection before auth on DELETE', async () => {
      // Arrange: CSRF passes, auth is called next
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'report-123',
        title: 'Test Report',
        org: {
          members: [{ userId: 'user-123' }],
        },
      })
      mockPrisma.report.delete.mockResolvedValue({ id: 'report-123' })

      // Act
      const req = createRequest({ method: 'DELETE' })
      await DELETE(req, { params: Promise.resolve({ id: 'report-123' }) })

      // Assert: CSRF ran first, then auth, then DB
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce()
      expect(mockAuth).toHaveBeenCalledOnce()
      expect(mockPrisma.report.findUnique).toHaveBeenCalled()
      expect(mockPrisma.report.delete).toHaveBeenCalledWith({
        where: { id: 'report-123' },
      })
    })

    it('should pass the request to withCsrfProtection', async () => {
      // Arrange
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'report-123',
        title: 'Test Report',
        org: {
          members: [{ userId: 'user-123' }],
        },
      })
      mockPrisma.report.delete.mockResolvedValue({ id: 'report-123' })

      // Act
      const req = createRequest({ method: 'DELETE' })
      await DELETE(req, { params: Promise.resolve({ id: 'report-123' }) })

      // Assert: withCsrfProtection was called with the request
      expect(mockWithCsrfProtection).toHaveBeenCalledWith(req)
    })

    it('should return 200 when CSRF passes and delete succeeds', async () => {
      // Arrange
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.report.findUnique.mockResolvedValue({
        id: 'report-123',
        title: 'Test Report',
        org: {
          members: [{ userId: 'user-123' }],
        },
      })
      mockPrisma.report.delete.mockResolvedValue({ id: 'report-123' })

      // Act
      const req = createRequest({ method: 'DELETE' })
      await DELETE(req, { params: Promise.resolve({ id: 'report-123' }) })

      // Assert
      expect(mockJsonStatus).toBe(200)
      expect((mockJsonBody as any)?.message).toBe('messages.reports.deleted')
    })
  })
})
