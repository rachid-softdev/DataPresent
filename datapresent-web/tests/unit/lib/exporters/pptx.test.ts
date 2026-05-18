// ==========================================
// PPTX Exporter Tests
// ==========================================

import { describe, it, expect } from 'vitest'

describe('pptx exporter', () => {
  it('should export generatePptx function', async () => {
    const module = await import('@/lib/exporters/pptx')
    expect(module.generatePptx).toBeDefined()
  })

  it('should import module', async () => {
    const module = await import('@/lib/exporters/pptx')
    expect(module).toBeDefined()
  })
})
