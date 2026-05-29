// ==========================================
// User Account Deletion Security Tests
// ==========================================
//
// Tests the DELETE /api/user confirmation logic:
// - Requires { confirm: true } in request body
// - Without confirmation, returns 400 error
// - Requires authenticated session

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockAuth = vi.hoisted(() => vi.fn())
const mockUnauthorized = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/errors', () => ({
  unauthorized: mockUnauthorized,
}))

// Mock NextResponse.json
const mockJson = vi.hoisted(() => vi.fn())
vi.mock('next/server', () => ({
  NextResponse: {
    json: mockJson,
  },
}))

describe('User Account Deletion — Confirmation Requirement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJson.mockReset()

    // Default: user is authenticated
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    })

    // Default: unauthorized returns 401
    mockUnauthorized.mockReturnValue(
      new Response(JSON.stringify({ error: 'errors.auth.unauthorized' }), { status: 401 })
    )
  })

  // -----------------------------------------------------------------------
  // Authentication check
  // -----------------------------------------------------------------------
  describe('authentication', () => {
    it('should return unauthorized when no session exists', async () => {
      mockAuth.mockResolvedValue(null)

      // Dynamically import to get fresh module
      const { DELETE } = await import(
        '@/app/[locale]/api/user/route'
      )

      const req = new Request('http://localhost:3000/api/user', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      await DELETE(req as any)

      expect(mockUnauthorized).toHaveBeenCalled()
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it('should return unauthorized when session has no user id', async () => {
      mockAuth.mockResolvedValue({ user: {} })

      const { DELETE } = await import(
        '@/app/[locale]/api/user/route'
      )

      const req = new Request('http://localhost:3000/api/user', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      await DELETE(req as any)

      expect(mockUnauthorized).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Confirmation requirement
  // -----------------------------------------------------------------------
  describe('confirmation requirement', () => {
    it('should require confirm: true in request body', async () => {
      const { DELETE } = await import(
        '@/app/[locale]/api/user/route'
      )

      const req = new Request('http://localhost:3000/api/user', {
        method: 'DELETE',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      await DELETE(req as any)

      // Should have been called with error about confirmation
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Confirmation required. Set confirm: true to delete your account.' },
        { status: 400 }
      )
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it('should return 400 when confirm is false', async () => {
      const { DELETE } = await import(
        '@/app/[locale]/api/user/route'
      )

      const req = new Request('http://localhost:3000/api/user', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: false }),
        headers: { 'Content-Type': 'application/json' },
      })

      await DELETE(req as any)

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Confirmation') }),
        { status: 400 }
      )
      expect(mockPrisma.user.delete).not.toHaveBeenCalled()
    })

    it('should proceed with deletion when confirm is true', async () => {
      mockPrisma.user.delete.mockResolvedValue({ id: 'user-123' })
      mockJson.mockReturnValue(new Response(JSON.stringify({ success: true })))

      const { DELETE } = await import(
        '@/app/[locale]/api/user/route'
      )

      const req = new Request('http://localhost:3000/api/user', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: true }),
        headers: { 'Content-Type': 'application/json' },
      })

      await DELETE(req as any)

      // Should have deleted the user
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      })

      // Should return success
      expect(mockJson).toHaveBeenCalledWith({ success: true })
    })
  })
})
