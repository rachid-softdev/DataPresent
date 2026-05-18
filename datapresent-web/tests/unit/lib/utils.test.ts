import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('foo', 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base', isActive && 'active')
      expect(result).toBe('base active')
    })

    it('should handle false conditionals', () => {
      const isActive = false
      const result = cn('base', isActive && 'active')
      expect(result).toBe('base')
    })

    it('should handle objects', () => {
      const result = cn({ 'active': true, 'disabled': false })
      expect(result).toBe('active')
    })

    it('should handle arrays', () => {
      const result = cn(['foo', 'bar'])
      expect(result).toBe('foo bar')
    })

    it('should merge duplicate tailwind classes with twMerge', () => () => {
      // When same class is applied multiple times with different values
      const result = cn('px-2 px-4')
      // twMerge keeps the last occurrence
      expect(result).toContain('px-4')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar')
      expect(result).toBe('foo bar')
    })
  })
})