import * as Sentry from '@sentry/nextjs'

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only enabled in production to avoid noise in development
 */
export function initSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Performance monitoring
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0.1,
      // Session replay (optional - can be heavy)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      // Environment info
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || `datapresent@${process.env.npm_package_version}`,
      // Filter out common non-critical errors
      beforeSend(event, hint) {
        const error = hint.originalException
        
        // Ignore network errors from external APIs (they're logged separately)
        if (error instanceof TypeError && error.message.includes('fetch')) {
          return null
        }
        
        // Ignore 404s on certain paths
        if (event.request?.url?.includes('/api/') && event.response?.status === 404) {
          return null
        }
        
        return event
      },
      // Integration options
      integrations: [
        Sentry.httpIntegration(),
        Sentry.moduleIntegration(),
      ],
    })
  }
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    // In development, just log to console
    console.error('[Sentry] Captured exception:', error, context)
  }
}

/**
 * Capture a message with level
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    })
  } else {
    console.log(`[Sentry] ${level}:`, message, context)
  }
}

/**
 * Add custom breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    })
  }
}

/**
 * Set user context for all events
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser(user)
  }
}

/**
 * Create a transaction for performance monitoring
 */
export async function startTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === 'production') {
    return Sentry.startSpan(
      {
        name,
        op,
      },
      fn
    )
  }
  
  // In development, just execute the function
  return fn()
}

/**
 * Middleware wrapper for API routes
 */
export function withSentryCapture(handler: (request: Request) => Promise<Response>) {
  return async function (request: Request): Promise<Response> {
    try {
      return await handler(request)
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        url: request.url,
        method: request.method,
      })
      throw error
    }
  }
}

// Export Sentry for direct access if needed
export { Sentry }