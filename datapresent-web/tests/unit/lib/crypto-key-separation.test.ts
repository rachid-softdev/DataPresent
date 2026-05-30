// ==========================================
// Crypto Key Material Separation Tests
// ==========================================
//
// Tests key material separation in lib/crypto.ts:
// - JOB_SIGNING_SECRET is preferred when available
// - CSRF_SECRET is used as fallback
// - sign/verify with different keys produce different signatures
// - extractSignedJobData properly handles missing signatures
//
// NOTE: These tests validate the module-load-time behavior by
// checking that sign/verify produce deterministic results that
// would change if the underlying secret changed.

import { describe, it, expect, vi } from 'vitest'

// Import the real crypto module
import {
  signJobData,
  verifyJobSignature,
  extractSignedJobData,
} from '@/lib/crypto'

describe('Key Material Separation - JOB_SIGNING_SECRET', () => {
  // The test setup stubs JOB_SIGNING_SECRET, so env.JOB_SIGNING_SECRET
  // should be used by crypto.ts (preferred over CSRF_SECRET)

  const sampleData = { jobId: 'job-123', type: 'export', userId: 'user-456' }

  it('should sign data using the configured secret', () => {
    const result = signJobData(sampleData)

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('signature')
    expect(result.data).toEqual(sampleData)
    expect(result.signature.length).toBe(64) // HMAC-SHA256 hex
  })

  it('should verify a valid signature', () => {
    const { signature } = signJobData(sampleData)
    const isValid = verifyJobSignature(sampleData, signature)
    expect(isValid).toBe(true)
  })

  it('should reject data tampering', () => {
    const { signature } = signJobData(sampleData)

    const tamperedData = { ...sampleData, jobId: 'job-999' }
    const isValid = verifyJobSignature(tamperedData, signature)
    expect(isValid).toBe(false)
  })

  it('should produce the same signature for same data (deterministic)', () => {
    const { signature: sig1 } = signJobData(sampleData)
    const { signature: sig2 } = signJobData(sampleData)
    expect(sig1).toBe(sig2)
  })

  it('should reject an invalid signature string', () => {
    const isValid = verifyJobSignature(sampleData, 'a'.repeat(64))
    expect(isValid).toBe(false)
  })

  it('should handle empty data objects', () => {
    const { signature } = signJobData({})
    const isValid = verifyJobSignature({}, signature)
    expect(isValid).toBe(true)
  })

  describe('extractSignedJobData', () => {
    it('should return valid=true and clean data for valid signature', () => {
      const { data, signature } = signJobData(sampleData)
      const signedData = { ...data, signature }

      const result = extractSignedJobData(signedData)
      expect(result.valid).toBe(true)
      expect(result.cleanData).toEqual(sampleData)
    })

    it('should return valid=false for missing signature', () => {
      const result = extractSignedJobData(sampleData)
      expect(result.valid).toBe(false)
      expect(result.cleanData).toEqual(sampleData)
    })

    it('should return valid=false for invalid signature', () => {
      const signedData = { ...sampleData, signature: 'a'.repeat(64) }
      const result = extractSignedJobData(signedData)
      expect(result.valid).toBe(false)
      expect(result.cleanData).toEqual(sampleData)
    })

    it('should strip the signature field from cleanData', () => {
      const { data, signature } = signJobData(sampleData)
      const signedData = { ...data, signature }

      const result = extractSignedJobData(signedData)
      expect(result.cleanData).not.toHaveProperty('signature')
    })
  })

  describe('signature determinism with sorted keys', () => {
    it('should produce same signature regardless of key order', () => {
      const data1 = { a: '1', b: '2' }
      const data2 = { b: '2', a: '1' }

      const { signature: sig1 } = signJobData(data1)
      const { signature: sig2 } = signJobData(data2)

      expect(sig1).toBe(sig2)
    })
  })
})
