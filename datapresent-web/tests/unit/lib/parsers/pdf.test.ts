// ==========================================
// PDF Parser Tests
// ==========================================

import { describe, it, expect } from 'vitest'

describe('pdf parser', () => {
  it('should export parsePdf function', async () => {
    const module = await import('@/lib/parsers/pdf')
    expect(module.parsePdf).toBeDefined()
  })

  it('should throw when called (placeholder implementation)', async () => {
    const { parsePdf } = await import('@/lib/parsers/pdf')

    const buffer = Buffer.from('test')
    await expect(parsePdf(buffer, 'test.pdf')).rejects.toThrow(
      'PDF parsing is not yet implemented'
    )
  })

  it('should throw regardless of filename', async () => {
    const { parsePdf } = await import('@/lib/parsers/pdf')

    const buffer = Buffer.from('test')
    await expect(parsePdf(buffer, 'report.pdf')).rejects.toThrow(
      'PDF parsing is not yet implemented'
    )
  })
})
