import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, isPasswordValid } from '@/lib/password'

describe('password', () => {
  describe('isPasswordValid', () => {
    it('should accept valid passwords', () => {
      expect(isPasswordValid('password123')).toBe(true)
      expect(isPasswordValid('abcdefgh')).toBe(true)
      expect(isPasswordValid('MyStr0ng!Pass')).toBe(true)
    })

    it('should reject passwords that are too short', () => {
      expect(isPasswordValid('abc')).toBe(false)
      expect(isPasswordValid('')).toBe(false)
      expect(isPasswordValid('abcdefg')).toBe(false) // 7 chars
    })

    it('should reject passwords without letters', () => {
      expect(isPasswordValid('12345678')).toBe(false)
      expect(isPasswordValid('!@#$%^&*')).toBe(false)
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'testPassword123'
      const hashed = await hashPassword(password)

      expect(hashed).not.toBe(password)
      expect(hashed).toContain('$argon2id$')

      const isValid = await verifyPassword(password, hashed)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'correctPassword'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword('wrongPassword', hashed)
      expect(isValid).toBe(false)
    })

    it('should produce different hashes for the same password', async () => {
      const password = 'samePassword'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle invalid hash gracefully', async () => {
      const isValid = await verifyPassword('test', 'not-a-valid-hash')
      expect(isValid).toBe(false)
    })
  })
})
