// ==========================================
// i18n Request Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  getRequestConfig: vi.fn((callback) => callback),
}))

// Mock messages
vi.mock('../messages/en.json', () => ({ default: { greeting: 'Hello' } }))
vi.mock('../messages/fr.json', () => ({ default: { greeting: 'Bonjour' } }))

describe('i18n/request', () => {
  it('should export getRequestConfig function', async () => {
    const module = await import('@/i18n/request')
    expect(module.default).toBeDefined()
  })
})
