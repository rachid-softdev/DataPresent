// ==========================================
// Google Sheets Parser Tests
// ==========================================

import { describe, it, expect } from 'vitest'
import { shouldConvertToNumber } from '@/lib/parsers/gsheets'

describe('shouldConvertToNumber', () => {
  it('should convert "123" to number', () => {
    expect(shouldConvertToNumber('123')).toBe(true)
  })

  it('should NOT convert "02134" (leading zero, String(num) !== original)', () => {
    expect(shouldConvertToNumber('02134')).toBe(false)
  })

  it('should NOT convert "abc"', () => {
    expect(shouldConvertToNumber('abc')).toBe(false)
  })

  it('should NOT convert "" (empty string)', () => {
    expect(shouldConvertToNumber('')).toBe(false)
  })

  it('should convert "123.45" to number', () => {
    expect(shouldConvertToNumber('123.45')).toBe(true)
  })

  it('should NOT convert "001" (leading zeros)', () => {
    expect(shouldConvertToNumber('001')).toBe(false)
  })

  it('should NOT convert null', () => {
    expect(shouldConvertToNumber(null as any)).toBe(false)
  })

  it('should NOT convert strings that look like dates', () => {
    // "2024-01-01" → Number("2024-01-01") = NaN → not finite
    expect(shouldConvertToNumber('2024-01-01')).toBe(false)
  })

  it('should convert negative numbers', () => {
    expect(shouldConvertToNumber('-42')).toBe(true)
  })

  it('should NOT convert strings with trailing characters', () => {
    expect(shouldConvertToNumber('123abc')).toBe(false)
  })
})

describe.skip('Google Sheets Parser', () => {
  it('should parse Google Sheet', async () => {
    const { parseGoogleSheet } = await import('@/lib/parsers/gsheets')
    expect(parseGoogleSheet).toBeDefined()
  })
})
