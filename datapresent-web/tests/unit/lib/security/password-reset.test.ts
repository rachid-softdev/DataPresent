// ==========================================
// Password Reset Security Tests
// ==========================================
//
// Tests isPasswordValid() enforcement:
// - Minimum 12 character requirement (OWASP 2024)
// - Character type diversity (upper, lower, digit, special)
// - Old < 8 char passwords now correctly rejected

import { describe, it, expect } from 'vitest'
import { isPasswordValid } from '@/lib/password'

describe('Password Reset Security', () => {
  describe('isPasswordValid — length enforcement (min 12 chars)', () => {
    it('should reject passwords with length < 12', () => {
      // 8-11 char passwords (old standard, now rejected)
      expect(isPasswordValid('Abc123!')).toBe(false)       // 7 chars
      expect(isPasswordValid('Abc123!x')).toBe(false)       // 8 chars — old min
      expect(isPasswordValid('Abc123!xy')).toBe(false)      // 9 chars
      expect(isPasswordValid('Abc123!xyz')).toBe(false)     // 10 chars
      expect(isPasswordValid('Abc123!xyzA')).toBe(false)    // 11 chars
    })

    it('should reject empty string', () => {
      expect(isPasswordValid('')).toBe(false)
    })

    it('should reject null and undefined', () => {
      expect(isPasswordValid(null as unknown as string)).toBe(false)
      expect(isPasswordValid(undefined as unknown as string)).toBe(false)
    })
  })

  describe('isPasswordValid — character type diversity', () => {
    it('should reject passwords without uppercase letter', () => {
      expect(isPasswordValid('lowercase123!@')).toBe(false)
    })

    it('should reject passwords without lowercase letter', () => {
      expect(isPasswordValid('UPPERCASE123!@')).toBe(false)
    })

    it('should reject passwords without digit', () => {
      const result = isPasswordValid('UppercaseLower!@')
      expect(result).toBe(false)
    })

    it('should reject passwords without special character', () => {
      const result = isPasswordValid('UppercaseLower123')
      expect(result).toBe(false)
    })
  })

  describe('isPasswordValid — valid passwords', () => {
    it('should accept password with all required types at exactly 12 chars', () => {
      // 12 chars with upper, lower, digit, special
      expect(isPasswordValid('Str0ng!PassA')).toBe(true)
    })

    it('should accept password with all required types at 16 chars', () => {
      expect(isPasswordValid('MyStr0ng!PassOK')).toBe(true)
    })

    it('should accept password with all required types at 24 chars', () => {
      expect(isPasswordValid('ThisIsAV3ryStr0ng!Pass')).toBe(true)
    })

    it('should accept passwords with extended special characters', () => {
      expect(isPasswordValid('P@ssw0rd$#!@L')).toBe(true)
      expect(isPasswordValid('Test{123}[OK!]')).toBe(true)
    })
  })

  describe('isPasswordValid — regression: old < 8 passwords now fail', () => {
    // Common weak passwords that would have passed old < 8 check
    const weakPasswords = [
      'Pass123!',    // 8 chars, has everything — too short now
      'Abc123!$',    // 8 chars
      'Qwerty!1',    // 8 chars
      'LetMe!n1',    // 8 chars
      'P@ss1234',    // 8 chars
    ]

    for (const pwd of weakPasswords) {
      it(`should reject "${pwd}" (now requires 12+ chars)`, () => {
        // Verify these would have passed the OLD check (length < 8)
        expect(pwd.length).toBeGreaterThanOrEqual(8)
        // But they fail the NEW check (length < 12)
        expect(isPasswordValid(pwd)).toBe(false)
      })
    }
  })

  describe('isPasswordValid — special character handling', () => {
    it('should accept passwords with various special characters', () => {
      // The special char regex covers: !@#$%^&*()_+-=[]{};':"\\|,.<>/?`
      expect(isPasswordValid('TestPass123!')).toBe(true)
      expect(isPasswordValid('TestPass123@')).toBe(true)
      expect(isPasswordValid('TestPass123#')).toBe(true)
      expect(isPasswordValid('TestPass123$')).toBe(true)
      expect(isPasswordValid('TestPass123%')).toBe(true)
      expect(isPasswordValid('TestPass123^')).toBe(true)
      expect(isPasswordValid('TestPass123&')).toBe(true)
      expect(isPasswordValid('TestPass123*')).toBe(true)
      expect(isPasswordValid('TestPass123(')).toBe(true)
      expect(isPasswordValid('TestPass123)')).toBe(true)
    })
  })
})
