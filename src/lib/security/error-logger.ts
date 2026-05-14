/**
 * Centralized error logging utility
 */
export async function logApiError(
  error: Error,
  context: { userId?: string; path: string; method: string }
): Promise<void> {
  const errorData = {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  }

  // Log to console in all environments
  console.error('[API Error]', JSON.stringify(errorData, null, 2))

  // Optionally send to external error tracking service
  if (process.env.ERROR_LOG_ENDPOINT) {
    try {
      await fetch(process.env.ERROR_LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      })
    } catch (loggingError) {
      console.error('Failed to send error to logging service:', loggingError)
    }
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(event: {
  type: 'csrf_failure' | 'auth_failure' | 'rate_limit' | 'unauthorized_access'
  userId?: string
  path: string
  details?: string
}): void {
  console.warn('[Security Event]', JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  }))
}