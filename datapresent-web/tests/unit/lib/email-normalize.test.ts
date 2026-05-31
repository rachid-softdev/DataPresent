// ==========================================
// Email Normalize Tests
// ==========================================
//
// Tests for normalizeEmail() in lib/email-normalize.ts:
// - Lowercases, trims, applies NFKC normalization
// - Fails closed (returns empty string for non-strings or falsy)
// - Idempotent

import { describe, it, expect } from 'vitest'
import { normalizeEmail } from '@/lib/email-normalize'

describe('normalizeEmail', () => {
  it('should lowercase and trim the email', () => {
    expect(normalizeEmail('  Foo@Bar.COM  ')).toBe('foo@bar.com')
  })

  it('should lowercase a typical email', () => {
    expect(normalizeEmail('USER@Example.COM')).toBe('user@example.com')
  })

  it('should handle empty string', () => {
    expect(normalizeEmail('')).toBe('')
  })

  it('should return empty string when input is undefined', () => {
    expect(normalizeEmail(undefined as unknown as string)).toBe('')
  })

  it('should handle leading/trailing whitespace', () => {
    expect(normalizeEmail('  Test@Email.com  ')).toBe('test@email.com')
  })

  it('should apply NFKC normalization (decomposed é → precomposed é)', () => {
    // 'é' can be represented as:
    // - U+00E9 (precomposed, NFC) - single codepoint
    // - U+0065 U+0301 (decomposed, NFD) - 'e' + combining acute accent
    const decomposed = 'nadie\u0300me@example.com' // 'nadìeme' with combining grave
    const precomposed = 'nadi\u00E8me@example.com' // 'nadième' with precomposed è
    const normalized = normalizeEmail(decomposed)
    expect(normalized).toBe(precomposed)
    // Also verify it's NFKC (should be same as NFC for this case)
    expect(normalized.normalize('NFKC')).toBe(normalized)
  })

  it('should be idempotent (calling twice gives same result)', () => {
    const input = '  Foo@Bar.COM  '
    const first = normalizeEmail(input)
    const second = normalizeEmail(first)
    expect(first).toBe(second)
    expect(first).toBe('foo@bar.com')
  })

  it('should handle already normalized email', () => {
    expect(normalizeEmail('foo@bar.com')).toBe('foo@bar.com')
  })

  it('should handle mixed case and whitespace together', () => {
    expect(normalizeEmail('  JOHN.DOE@Example.org  ')).toBe('john.doe@example.org')
  })

  it('should not crash on special but valid email characters', () => {
    // Email "plus addressing" and dots
    expect(normalizeEmail('User+Tag@Example.COM')).toBe('user+tag@example.com')
  })
})
