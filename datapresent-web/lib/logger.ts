// ==========================================
// Zero-dependency structured logger
// ==========================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  orgId?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    if (process.env.NODE_ENV === "production") {
      process.stdout.write(JSON.stringify(entry) + "\n");
    } else {
      const prefix = `[${level.toUpperCase()}]`;
      const consoleFn =
        level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      consoleFn(prefix, message, this.context, data ?? "");
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }
  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }
  error(message: string, data?: Record<string, unknown>) {
    this.log("error", message, data);
  }
  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }
}

export const logger = new Logger();
