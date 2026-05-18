// ==========================================
// Auth Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Skip these tests - auth.ts requires Node.js/Next.js internals
// that aren't available in jsdom environment
describe.skip('auth', () => {
  it('should export auth handlers', async () => {
    const module = await import('@/lib/auth')
    expect(module).toBeDefined()
    expect(module.handlers).toBeDefined()
    expect(module.auth).toBeDefined()
    expect(module.signIn).toBeDefined()
    expect(module.signOut).toBeDefined()
  })
})
