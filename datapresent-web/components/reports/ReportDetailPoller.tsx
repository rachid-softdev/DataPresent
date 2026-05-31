'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ReportDetailPollerProps {
  reportId: string
  status: string
}

/**
 * Polls the report detail API every 5 seconds while the report has a
 * PROCESSING or PENDING status. Triggers a router refresh once the
 * status transitions to DONE or ERROR.
 */
export function ReportDetailPoller({ reportId, status }: ReportDetailPollerProps) {
  const router = useRouter()
  const activeRef = useRef(false)

  const isProcessing = status === 'PENDING' || status === 'PROCESSING'
  const MAX_RETRIES = 60 // 5 minutes max (60 × 5s)

  useEffect(() => {
    if (!isProcessing) {
      activeRef.current = false
      return
    }

    activeRef.current = true
    let retryCount = 0

    const interval = setInterval(async () => {
      retryCount++
      if (retryCount > MAX_RETRIES) {
        activeRef.current = false
        clearInterval(interval)
        console.warn(`[ReportDetailPoller] Max retries (${MAX_RETRIES}) reached for report ${reportId}`)
        return
      }

      try {
        const res = await fetch(`/api/reports/${reportId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status !== 'PENDING' && data.status !== 'PROCESSING' && activeRef.current) {
          activeRef.current = false
          clearInterval(interval)
          router.refresh()
        }
      } catch (error) {
        console.warn(`[ReportDetailPoller] Fetch failed for report ${reportId}, retrying (${retryCount}/${MAX_RETRIES}):`, error)
      }
    }, 5000)

    return () => {
      activeRef.current = false
      clearInterval(interval)
    }
  }, [reportId, isProcessing, router])

  return null
}
