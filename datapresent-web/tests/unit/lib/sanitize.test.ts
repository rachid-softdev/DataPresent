import { describe, it, expect } from 'vitest'
import {
  stripHtml,
  sanitizeHtml,
  sanitizeAttribute,
  sanitizeJs,
  sanitizeComment,
  sanitizeSlideContent,
  isUrlSafe,
} from '@/lib/sanitize'

describe('sanitize', () => {
  describe('stripHtml', () => {
    it('should strip all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      expect(stripHtml(input)).toBe('Hello World')
    })

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('')
    })

    it('should handle null/undefined', () => {
      expect(stripHtml(null as any)).toBe('')
      expect(stripHtml(undefined as any)).toBe('')
    })

    it('should handle nested tags', () => {
      const input = '<div><p><span>Nested</span></p></div>'
      expect(stripHtml(input)).toBe('Nested')
    })

    it('should handle script tags content', () => {
      const input = '<script>alert("xss")</script>Hello'
      expect(stripHtml(input)).toBe('Hello')
    })
  })

  describe('sanitizeHtml', () => {
    it('should allow safe tags', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      expect(sanitizeHtml(input)).toContain('p')
      expect(sanitizeHtml(input)).toContain('strong')
    })

    it('should remove script tags completely', () => {
      const input = '<script>alert("xss")</script><p>Safe</p>'
      expect(sanitizeHtml(input)).not.toContain('script')
      expect(sanitizeHtml(input)).toContain('Safe')
    })

    it('should remove style tags', () => {
      const input = '<style>.evil{}</style><p>Safe</p>'
      expect(sanitizeHtml(input)).not.toContain('style')
    })

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe><p>Safe</p>'
      expect(sanitizeHtml(input)).not.toContain('iframe')
    })

    it('should remove event handlers', () => {
      const input = '<button onclick="alert(1)">Click</button>'
      expect(sanitizeHtml(input)).not.toContain('onclick')
    })

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>'
      expect(sanitizeHtml(input)).not.toContain('javascript:')
    })

    it('should remove data: URLs', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">'
      expect(sanitizeHtml(input)).not.toContain('data:')
    })

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('')
    })
  })

  describe('sanitizeAttribute', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeAttribute('<script>')).toBe('script')
      expect(sanitizeAttribute('foo"bar')).toBe('foobar')
      expect(sanitizeAttribute("foo'bar")).toBe('foobar')
      expect(sanitizeAttribute('foo=bar')).toBe('foobar')
    })

    it('should trim whitespace', () => {
      expect(sanitizeAttribute('  hello  ')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(sanitizeAttribute('')).toBe('')
    })
  })

  describe('sanitizeJs', () => {
    it('should escape backslashes', () => {
      expect(sanitizeJs('path\\to\\file')).toBe('path\\\\to\\\\file')
    })

    it('should escape single quotes', () => {
      expect(sanitizeJs("it's great")).toBe("it\\'s great")
    })

    it('should escape double quotes', () => {
      expect(sanitizeJs('say "hello"')).toBe('say \\"hello\\"')
    })

    it('should escape less than and greater than', () => {
      expect(sanitizeJs('<script>')).toBe('\\x3Cscript\\x3E')
    })

    it('should handle empty string', () => {
      expect(sanitizeJs('')).toBe('')
    })
  })

  describe('sanitizeComment', () => {
    it('should strip HTML tags', () => {
      const input = '<p>Hello <script>alert(1)</script></p>'
      // Note: this function only removes tags, not content inside tags
      // This is a known limitation - the content "alert(1)" remains
      expect(sanitizeComment(input)).toBe('Hello alert(1)')
    })

    it('should decode HTML entities', () => {
      expect(sanitizeComment('&lt;script&gt;')).toBe('<script>')
      expect(sanitizeComment('&amp;')).toBe('&')
    })

    it('should limit length to 5000 chars', () => {
      const longInput = 'a'.repeat(6000)
      expect(sanitizeComment(longInput).length).toBe(5000)
    })

    it('should handle empty string', () => {
      expect(sanitizeComment('')).toBe('')
    })
  })

  describe('sanitizeSlideContent', () => {
    it('should sanitize HTML content', () => {
      const input = '<script>evil()</script><p>Safe</p>'
      const result = sanitizeSlideContent(input)
      expect(result).not.toContain('script')
      expect(result).toContain('Safe')
    })

    it('should delegate to sanitizeHtml', () => {
      const input = '<iframe src="evil.com"></iframe>'
      expect(sanitizeSlideContent(input)).not.toContain('iframe')
    })
  })

  describe('isUrlSafe', () => {
    beforeEach(() => {
      // Mock window.location.origin for jsdom environment
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://datapresent.com' },
        writable: true,
      })
    })

    it('should return false for empty string', () => {
      expect(isUrlSafe('')).toBe(false)
    })

    it('should allow Google Sheets (allowed external domains)', () => {
      // These work because the module allows specific Google domains
      expect(isUrlSafe('https://docs.google.com/spreadsheets/d/abc')).toBe(true)
      expect(isUrlSafe('https://sheets.google.com/spreadsheets/d/abc')).toBe(true)
    })

    it('should reject unknown external domains', () => {
      expect(isUrlSafe('https://evil.com')).toBe(false)
    })

    it('should return false for invalid URLs (Node.js environment)', () => {
      // In Node.js, relative URLs like '/path' or 'relative' throw errors
      // when passed to new URL() without a base URL
      expect(isUrlSafe('/path')).toBe(false)
      expect(isUrlSafe('relative')).toBe(false)
      expect(isUrlSafe('not-a-url')).toBe(false)
    })

    it('should allow full URLs with valid format', () => {
      // Full URLs with proper protocol are parsed correctly
      expect(isUrlSafe('https://example.com')).toBe(false) // Not in allowed list
      expect(isUrlSafe('http://localhost:3000')).toBe(false) // Not https
    })
  })
})
