// ==========================================
// CSRF Security Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCookies } = vi.hoisted(() => ({
  mockCookies: {
    get: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookies),
}))

import { generateCsrfToken, validateCsrfToken } from '@/lib/security/csrf'
import { signJobData, verifyJobSignature } from '@/lib/crypto'

describe('CSRF Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCsrfToken', () => {
    it('should generate a valid CSRF token', () => {
      const token = generateCsrfToken()

      // Token should have 3 parts separated by colons
      const parts = token.split(':')
      expect(parts.length).toBe(3)

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0].length).toBe(32)

      // Tag should be 32 hex chars (16 bytes)
      expect(parts[1].length).toBe(32)
    })

    it('should generate different tokens each time', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()

      expect(token1).not.toBe(token2)
    })
  })

  describe('validateCsrfToken', () => {
    it('should return false for empty token', async () => {
      const result = await validateCsrfToken('')
      expect(result).toBe(false)
    })

    it('should return false for invalid token format', async () => {
      const result = await validateCsrfToken('invalid-token')
      expect(result).toBe(false)
    })

    it('should return false for token with wrong number of parts', async () => {
      const result = await validateCsrfToken('part1:part2')
      expect(result).toBe(false)
    })

    it('should return true for valid token', async () => {
      const token = generateCsrfToken()
      const result = await validateCsrfToken(token)
      expect(result).toBe(true)
    })

    it('should return false for tampered token', async () => {
      const token = generateCsrfToken()
      const parts = token.split(':')
      // Tamper with the encrypted part
      parts[2] = parts[2].substring(0, 4) + '0000' + parts[2].substring(8)
      const tamperedToken = parts.join(':')

      const result = await validateCsrfToken(tamperedToken)
      expect(result).toBe(false)
    })

    it('should validate token with matching userId', async () => {
      const userId = 'user-123'
      const token = generateCsrfToken(userId)
      const result = await validateCsrfToken(token, userId)
      expect(result).toBe(true)
    })

    it('should reject token with non-matching userId', async () => {
      const token = generateCsrfToken('user-123')
      const result = await validateCsrfToken(token, 'user-456')
      expect(result).toBe(false)
    })

    it('should accept token without userId when no userId provided', async () => {
      const token = generateCsrfToken()
      const result = await validateCsrfToken(token)
      expect(result).toBe(true)
    })
  })

  describe('signJobData and verifyJobSignature', () => {
    it('should sign data and verify signature', () => {
      const data = { jobId: 'job-123', type: 'export' }
      const { data: signedData, signature } = signJobData(data)

      expect(signedData).toEqual(data)
      expect(signature).toBeDefined()
      expect(signature.length).toBe(64) // SHA256 hex = 64 chars
    })

    it('should verify valid signature', () => {
      const data = { jobId: 'job-123', type: 'export' }
      const { signature } = signJobData(data)

      const isValid = verifyJobSignature(data, signature)
      expect(isValid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const data = { jobId: 'job-123', type: 'export' }
      const invalidSignature = 'a'.repeat(64)

      const isValid = verifyJobSignature(data, invalidSignature)
      expect(isValid).toBe(false)
    })

    it('should detect data tampering', () => {
      const data = { jobId: 'job-123', type: 'export' }
      const { signature } = signJobData(data)

      // Tamper with data
      const tamperedData = { jobId: 'job-999', type: 'export' }

      const isValid = verifyJobSignature(tamperedData, signature)
      expect(isValid).toBe(false)
    })

    it('should produce same signature for same data', () => {
      const data = { jobId: 'job-123', type: 'export' }
      const { signature: sig1 } = signJobData(data)
      const { signature: sig2 } = signJobData(data)

      expect(sig1).toBe(sig2)
    })
  })
})
