// ==========================================
// Organizations Route CSRF Protection (Fix #1)
// ==========================================
//
// Tests that PATCH and DELETE on /api/organizations/[id] enforce CSRF:
// - PATCH without CSRF token returns 403
// - PATCH with valid CSRF token passes through
// - DELETE without CSRF token returns 403
// - DELETE with valid CSRF token passes through
// - GET (safe method) skips CSRF entirely
//
// The CSRF middleware itself is tested in lib/security/csrf-middleware.test.ts.
// These tests verify the route-level integration — that withCsrfProtection()
// is actually called and its response is respected.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockWithCsrfProtection = vi.hoisted(() => vi.fn())
const mockAuth = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  membership: {
    findFirst: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockUnauthorized = vi.hoisted(() => vi.fn())
const mockForbidden = vi.hoisted(() => vi.fn())
const mockNotFound = vi.hoisted(() => vi.fn())
const mockBadRequest = vi.hoisted(() => vi.fn())

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
  ERROR_CODES: {
    ERR_VALIDATION_REQUIRED: 'errors.validation.required',
    ERR_RESOURCE_OWNER_DELETE: 'errors.resource.ownerDelete',
  },
  unauthorized: mockUnauthorized,
  forbidden: mockForbidden,
  notFound: mockNotFound,
  badRequest: mockBadRequest,
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
import { PATCH, DELETE, GET } from '@/app/[locale]/api/organizations/[id]/route'

/**
 * Create a minimal NextRequest-like object for testing
 */
function createRequest({
  method = 'GET',
  body,
  headers = {},
}: {
  method?: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
} = {}): Request {
  const h = new Headers({ 'Content-Type': 'application/json', ...headers })
  return new Request('http://localhost:3000/api/organizations/org-123', {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Organizations Route CSRF Protection (Fix #1)', () => {
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
    mockBadRequest.mockImplementation((code: string) => {
      return new Response(JSON.stringify({ error: code }), { status: 400 })
    })
  })

  // -----------------------------------------------------------------------
  // PATCH handler CSRF
  // -----------------------------------------------------------------------
  describe('PATCH — CSRF protection', () => {
    it('should return 403 when CSRF check fails on PATCH', async () => {
      // Arrange: CSRF middleware returns a 403 response
      const csrfResponse = new Response(
        JSON.stringify({ error: 'CSRF token required' }),
        { status: 403 }
      )
      mockWithCsrfProtection.mockResolvedValue(csrfResponse)

      // Act
      const req = createRequest({
        method: 'PATCH',
        body: { name: 'New Org Name' },
      })
      const result = await PATCH(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce()
      expect(result.status).toBe(403)
      const data = await result.json()
      expect(data.error).toContain('CSRF token')
      // Must not proceed to auth or DB
      expect(mockAuth).not.toHaveBeenCalled()
      expect(mockPrisma.membership.findFirst).not.toHaveBeenCalled()
    })

    it('should call withCsrfProtection before auth on PATCH', async () => {
      // Arrange: CSRF passes, auth is called next
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'membership-1',
        orgId: 'org-123',
        userId: 'user-123',
        role: 'ADMIN',
      })
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        name: 'New Org Name',
      })

      // Act
      const req = createRequest({
        method: 'PATCH',
        body: { name: 'New Org Name' },
      })
      await PATCH(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert: CSRF check ran first, then auth
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce()
      expect(mockAuth).toHaveBeenCalledOnce()
      expect(mockPrisma.organization.update).toHaveBeenCalled()
    })

    it('should pass the request to withCsrfProtection', async () => {
      // Arrange
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'membership-1',
        orgId: 'org-123',
        userId: 'user-123',
        role: 'ADMIN',
      })
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        name: 'Updated Name',
      })

      // Act
      const req = createRequest({
        method: 'PATCH',
        body: { name: 'Updated Name' },
      })
      await PATCH(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert: withCsrfProtection was called with the request
      expect(mockWithCsrfProtection).toHaveBeenCalledWith(req)
    })

    it('should return 200 when CSRF passes and update succeeds', async () => {
      // Arrange
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'membership-1',
        orgId: 'org-123',
        userId: 'user-123',
        role: 'ADMIN',
      })
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-123',
        name: 'Updated Name',
      })

      // Act
      const req = createRequest({
        method: 'PATCH',
        body: { name: 'Updated Name' },
      })
      await PATCH(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert
      expect(mockJsonStatus).toBe(200)
      expect((mockJsonBody as any)?.organization?.name).toBe('Updated Name')
    })
  })

  // -----------------------------------------------------------------------
  // DELETE handler CSRF
  // -----------------------------------------------------------------------
  describe('DELETE — CSRF protection', () => {
    it('should return 403 when CSRF check fails on DELETE', async () => {
      // Arrange: CSRF middleware returns a 403
      const csrfResponse = new Response(
        JSON.stringify({ error: 'CSRF token required' }),
        { status: 403 }
      )
      mockWithCsrfProtection.mockResolvedValue(csrfResponse)

      // Act
      const req = createRequest({ method: 'DELETE' })
      const result = await DELETE(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce()
      expect(result.status).toBe(403)
      const data = await result.json()
      expect(data.error).toContain('CSRF token')
      // Must not proceed
      expect(mockAuth).not.toHaveBeenCalled()
      expect(mockPrisma.organization.delete).not.toHaveBeenCalled()
    })

    it('should call withCsrfProtection before auth on DELETE', async () => {
      // Arrange
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'membership-1',
        orgId: 'org-123',
        userId: 'user-123',
        role: 'OWNER',
      })
      mockPrisma.organization.delete.mockResolvedValue({ id: 'org-123' })

      // Act
      const req = createRequest({ method: 'DELETE' })
      await DELETE(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert: CSRF ran first
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce()
      expect(mockAuth).toHaveBeenCalledOnce()
    })

    it('should return 200 when CSRF passes and delete succeeds', async () => {
      // Arrange
      mockWithCsrfProtection.mockResolvedValue(null)
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'membership-1',
        orgId: 'org-123',
        userId: 'user-123',
        role: 'OWNER',
      })
      mockPrisma.organization.delete.mockResolvedValue({ id: 'org-123' })

      // Act
      const req = createRequest({ method: 'DELETE' })
      await DELETE(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert
      expect(mockJsonStatus).toBe(200)
      expect((mockJsonBody as any)?.success).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // GET handler — safe method, no CSRF
  // -----------------------------------------------------------------------
  describe('GET — safe method, no CSRF required', () => {
    it('should NOT call withCsrfProtection for GET requests', async () => {
      // Arrange
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400).toISOString(),
      })
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'membership-1',
        orgId: 'org-123',
        userId: 'user-123',
        role: 'ADMIN',
      })
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        subscription: { plan: 'PRO', status: 'ACTIVE', currentPeriodEnd: null },
        _count: { reports: 5, members: 3 },
      })

      // Act
      const req = createRequest({ method: 'GET' })
      await GET(req, { params: Promise.resolve({ id: 'org-123' }) })

      // Assert
      expect(mockWithCsrfProtection).not.toHaveBeenCalled()
      expect(mockAuth).toHaveBeenCalledOnce()
      expect(mockJsonStatus).toBe(200)
    })
  })
})
