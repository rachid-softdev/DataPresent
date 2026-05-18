// ==========================================
// use-entitlements Hook Tests
// ==========================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock fetch globally
global.fetch = vi.fn()

describe('useEntitlements hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should export hook', async () => {
    const module = await import('@/hooks/use-entitlements')
    expect(module.useEntitlements).toBeDefined()
  })

  it('should export EntitlementsProvider', async () => {
    const module = await import('@/hooks/use-entitlements')
    expect(module.EntitlementsProvider).toBeDefined()
  })

  it('should fetch entitlements on mount', async () => {
    const mockEntitlements = {
      plan: 'PRO',
      features: { EXPORT_PDF: true, EXPORT_PPTX: true },
      limits: { REPORTS_PER_MONTH: 30 },
      usage: { REPORTS_PER_MONTH: 5 },
      resetAt: { REPORTS_PER_MONTH: '2024-01-01' },
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntitlements,
    })

    const { useEntitlements } = await import('@/hooks/use-entitlements')

    const { result } = renderHook(() => useEntitlements())

    await waitFor(() => {
      expect(result.current.entitlements).toEqual(mockEntitlements)
    })
  })

  it('should set loading state initially', async () => {
    const mockEntitlements = {
      plan: 'FREE',
      features: {},
      limits: {},
      usage: {},
      resetAt: {},
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntitlements,
    })

    const { useEntitlements } = await import('@/hooks/use-entitlements')

    const { result } = renderHook(() => useEntitlements())

    expect(result.current.isLoading).toBe(true)
  })

  it('should set error on failed fetch', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { useEntitlements } = await import('@/hooks/use-entitlements')

    const { result } = renderHook(() => useEntitlements())

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
  })

  it('should provide refetch function', async () => {
    const mockEntitlements = {
      plan: 'PRO',
      features: {},
      limits: {},
      usage: {},
      resetAt: {},
    }

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntitlements,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockEntitlements, plan: 'TEAM' }),
      })

    const { useEntitlements } = await import('@/hooks/use-entitlements')

    const { result } = renderHook(() => useEntitlements())

    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull()
    })

    await result.current.refetch()

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
