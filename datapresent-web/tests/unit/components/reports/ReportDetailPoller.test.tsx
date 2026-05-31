// ==========================================
// ReportDetailPoller Tests
// ==========================================
//
// Tests the polling component that monitors report generation status:
// - Starts polling when status is PENDING or PROCESSING
// - Stops polling when status becomes DONE or ERROR
// - Cleans up interval on unmount
// - Does NOT poll when initial status is DONE

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportDetailPoller } from '@/components/reports/ReportDetailPoller'

// ---------------------------------------------------------------------------
// Mock next/navigation — useRouter
// ---------------------------------------------------------------------------
const mockRouterRefresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}))

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------
const mockFetch = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Setup fake timers for interval control
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mockFetch.mockReset()
  // Default: global fetch is mocked
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ReportDetailPoller', () => {
  // -----------------------------------------------------------------------
  // Helper: render the poller
  // -----------------------------------------------------------------------
  function renderPoller(status: string, reportId: string = 'report-123') {
    return render(<ReportDetailPoller reportId={reportId} status={status} />)
  }

  // -----------------------------------------------------------------------
  // Poller does NOT start when status is DONE initially
  // -----------------------------------------------------------------------
  it('should NOT start polling when initial status is DONE', () => {
    renderPoller('DONE')

    // No fetch calls and no interval should have been started
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Poller does NOT start when status is ERROR initially
  // -----------------------------------------------------------------------
  it('should NOT start polling when initial status is ERROR', () => {
    renderPoller('ERROR')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Poller does NOT start when status is an unknown value initially
  // -----------------------------------------------------------------------
  it('should NOT start polling when initial status is unknown', () => {
    renderPoller('UNKNOWN')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Poller starts interval when status is PROCESSING
  // -----------------------------------------------------------------------
  it('should start polling when status is PROCESSING', async () => {
    // Arrange
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PROCESSING' }),
    })

    renderPoller('PROCESSING')

    // Initially no fetch call (interval hasn't fired yet)
    expect(mockFetch).not.toHaveBeenCalled()

    // Advance by 5 seconds (one interval tick)
    await vi.advanceTimersByTimeAsync(5000)

    // Should have called fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/reports/report-123')
  })

  // -----------------------------------------------------------------------
  // Poller starts interval when status is PENDING
  // -----------------------------------------------------------------------
  it('should start polling when status is PENDING', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PENDING' }),
    })

    renderPoller('PENDING')

    await vi.advanceTimersByTimeAsync(5000)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/reports/report-123')
  })

  // -----------------------------------------------------------------------
  // Poller stops when status becomes DONE
  // -----------------------------------------------------------------------
  it('should stop polling and refresh when status becomes DONE', async () => {
    // Arrange — first response shows PROCESSING, second shows DONE
    let callCount = 0
    mockFetch.mockImplementation(async () => {
      callCount++
      return {
        ok: true,
        json: async () => {
          if (callCount === 1) return { status: 'PROCESSING' }
          return { status: 'DONE' }
        },
      }
    })

    renderPoller('PROCESSING')

    // First tick — fetch returns PROCESSING, polling continues
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second tick — fetch returns DONE, polling stops
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Router.refresh should be called when status transitions to DONE
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)

    // Third tick — fetch should NOT be called (polling stopped)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  // -----------------------------------------------------------------------
  // Poller stops when status becomes ERROR
  // -----------------------------------------------------------------------
  it('should stop polling and refresh when status becomes ERROR', async () => {
    let callCount = 0
    mockFetch.mockImplementation(async () => {
      callCount++
      return {
        ok: true,
        json: async () => {
          if (callCount === 1) return { status: 'PROCESSING' }
          return { status: 'ERROR' }
        },
      }
    })

    renderPoller('PROCESSING')

    // First tick — PROCESSING
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second tick — ERROR, polling stops
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)

    // Third tick — no more polling
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  // -----------------------------------------------------------------------
  // Poller continues polling while status is PROCESSING
  // -----------------------------------------------------------------------
  it('should continue polling as long as status remains PROCESSING', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PROCESSING' }),
    })

    renderPoller('PROCESSING')

    // Tick 1-4: still PROCESSING
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockFetch).toHaveBeenCalledTimes(i + 1)
    }

    // Router.refresh should NOT have been called (status never changed)
    expect(mockRouterRefresh).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Cleanup — clearInterval on unmount
  // -----------------------------------------------------------------------
  it('should clear interval on unmount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PROCESSING' }),
    })

    const { unmount } = renderPoller('PROCESSING')

    // First tick fires
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Unmount the component
    unmount()

    // Second tick should NOT fire (interval cleared)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------
  // Silently handles fetch errors (continues polling)
  // -----------------------------------------------------------------------
  it('should silently retry when fetch fails', async () => {
    // First call fails, second call succeeds with PROCESSING
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'PROCESSING' }),
      })

    renderPoller('PROCESSING')

    // First tick — fetch fails, polling continues silently
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second tick — fetch succeeds, still PROCESSING
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockRouterRefresh).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Silently handles non-ok response (continues polling)
  // -----------------------------------------------------------------------
  it('should silently retry when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    })

    renderPoller('PROCESSING')

    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Polling continues
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockRouterRefresh).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Uses correct reportId in the fetch URL
  // -----------------------------------------------------------------------
  it('should use the provided reportId in fetch URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PROCESSING' }),
    })

    renderPoller('PROCESSING', 'custom-report-id-999')

    await vi.advanceTimersByTimeAsync(5000)

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/custom-report-id-999')
  })

  // -----------------------------------------------------------------------
  // Component renders nothing (returns null)
  // -----------------------------------------------------------------------
  it('should render nothing (returns null)', () => {
    const { container } = renderPoller('PROCESSING')
    expect(container.innerHTML).toBe('')
  })
})
