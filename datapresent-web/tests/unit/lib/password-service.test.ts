// ==========================================
// Password Service Tests
// ==========================================
//
// Tests the password service layer:
// - setUserPassword upserts hashed password
// - verifyUserPassword verifies against stored hash
// - userHasPassword checks if password exists

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — must use vi.hoisted for variables referenced in vi.mock
// ---------------------------------------------------------------------------
const mockPrisma = vi.hoisted(() => ({
  password: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockHashPassword = vi.hoisted(() => vi.fn())
const mockVerifyPassword = vi.hoisted(() => vi.fn())

vi.mock('@/lib/password', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}))

import { verifyUserPassword, userHasPassword, setUserPassword } from '@/lib/password-service'

describe('Password Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // verifyUserPassword
  // -----------------------------------------------------------------------
  describe('verifyUserPassword', () => {
    it('should return true for matching password', async () => {
      mockPrisma.password.findUnique.mockResolvedValue({ hash: 'hashed-value' })
      mockVerifyPassword.mockResolvedValue(true)

      const result = await verifyUserPassword('user-1', 'correct-password')

      expect(result).toBe(true)
      expect(mockPrisma.password.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(mockVerifyPassword).toHaveBeenCalledWith('correct-password', 'hashed-value')
    })

    it('should return false for wrong password', async () => {
      mockPrisma.password.findUnique.mockResolvedValue({ hash: 'hashed-value' })
      mockVerifyPassword.mockResolvedValue(false)

      const result = await verifyUserPassword('user-1', 'wrong-password')

      expect(result).toBe(false)
      expect(mockVerifyPassword).toHaveBeenCalledWith('wrong-password', 'hashed-value')
    })

    it('should return false if no password exists', async () => {
      mockPrisma.password.findUnique.mockResolvedValue(null)

      const result = await verifyUserPassword('user-1', 'any-password')

      expect(result).toBe(false)
      expect(mockVerifyPassword).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // userHasPassword
  // -----------------------------------------------------------------------
  describe('userHasPassword', () => {
    it('should return true if password exists', async () => {
      mockPrisma.password.findUnique.mockResolvedValue({ id: 'pw-1' })

      const result = await userHasPassword('user-1')

      expect(result).toBe(true)
      expect(mockPrisma.password.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { id: true },
      })
    })

    it('should return false if no password exists', async () => {
      mockPrisma.password.findUnique.mockResolvedValue(null)

      const result = await userHasPassword('user-1')

      expect(result).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // setUserPassword
  // -----------------------------------------------------------------------
  describe('setUserPassword', () => {
    it('should call prisma.password.upsert with hashed password', async () => {
      mockHashPassword.mockResolvedValue('hashed-abc123')
      mockPrisma.password.upsert.mockResolvedValue({ id: 'pw-1', userId: 'user-1' })

      await setUserPassword('user-1', 'new-password')

      expect(mockHashPassword).toHaveBeenCalledWith('new-password')
      expect(mockPrisma.password.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', hash: 'hashed-abc123' },
        update: { hash: 'hashed-abc123' },
      })
    })
  })
})
