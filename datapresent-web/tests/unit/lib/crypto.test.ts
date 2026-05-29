// ==========================================
// Crypto Utility Tests (extractTokenPrefix)
// ==========================================

import { describe, it, expect } from 'vitest'
import { extractTokenPrefix } from '@/lib/crypto'

describe('extractTokenPrefix', () => {
  it('should return first 12 characters of a 64-char hex token', () => {
    const token = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    expect(extractTokenPrefix(token)).toBe('abcdef012345')
  })

  it('should return first 12 characters for any string length >= 12', () => {
    const token = 'aaaaaaaa1111bbbbbb2222'
    expect(extractTokenPrefix(token)).toBe('aaaaaaaa1111')
  })

  it('should handle shorter strings gracefully (string < 12 chars)', () => {
    const token = 'short'
    expect(extractTokenPrefix(token)).toBe('short')
  })

  it('should handle empty string', () => {
    expect(extractTokenPrefix('')).toBe('')
  })

  it('should handle exactly 12 characters', () => {
    expect(extractTokenPrefix('1234567890ab')).toBe('1234567890ab')
  })

  it('should handle tokens with non-hex characters', () => {
    expect(extractTokenPrefix('hello-world-!!!')).toBe('hello-world-')
  })
})
