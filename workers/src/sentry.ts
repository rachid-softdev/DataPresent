import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only enabled in production to avoid noise in development
 */
export function initSentry() {
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Performance monitoring
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0.1,
      // Environment info
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version
        ? `workers@${process.env.npm_package_version}`
        : "workers@0.0.0",
      // Filter out common non-critical errors
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Ignore network errors from external APIs (they're logged separately)
        if (error instanceof TypeError && error.message.includes("fetch")) {
          return null;
        }

        return event;
      },
      // Integration options
      integrations: [Sentry.httpIntegration(), Sentry.modulesIntegration()],
    });
  }
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    // In development, just log to console
    console.error("[Sentry] Captured exception:", error, context);
  }
}

/**
 * Capture a message with level
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    const consoleMethod =
      {
        fatal: console.error,
        error: console.error,
        warning: console.warn,
        info: console.info,
        debug: console.debug,
      }[level] ?? console.log;

    consoleMethod(`[Sentry] ${level}:`, message, context);
  }
}

/**
 * Add custom breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  }
}

/**
 * Set user context for all events
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (process.env.NODE_ENV === "production") {
    Sentry.setUser(user);
  }
}

/**
 * Create a transaction for performance monitoring
 */
export async function startTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV === "production") {
    return Sentry.startSpan(
      {
        name,
        op,
      },
      fn,
    );
  }

  // In development, just execute the function
  return fn();
}

// Export Sentry for direct access if needed
export { Sentry };
