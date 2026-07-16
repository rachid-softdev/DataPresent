// ==========================================
// Structured Logger Tests (Item 11)
// ==========================================
//
// Tests for lib/logger.ts:
// - logger.info() produces valid JSON in production mode
// - logger.child() inherits context
// - logger.error() includes error context
// - Development mode uses console.log/error with readable format

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Logger (lib/logger.ts)", () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Capture original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Spy on output streams
    stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Clear module registry to get fresh logger instance each test
    vi.resetModules();
  });

  afterEach(() => {
    // Restore NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    }
    vi.restoreAllMocks();
  });

  // ======================================================================
  // Production mode tests (JSON output)
  // ======================================================================

  it("should output valid JSON via stdout in production mode", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    logger.info("test message");

    expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;

    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({
      level: "info",
      message: "test message",
    });
    expect(parsed.timestamp).toBeDefined();
    expect(() => new Date(parsed.timestamp)).not.toThrow();
  });

  it("should include requestId in JSON output when context is set", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    const contextualLogger = logger.child({ requestId: "abc-123" });
    contextualLogger.info("with context");

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.requestId).toBe("abc-123");
    expect(parsed.message).toBe("with context");
    expect(parsed.level).toBe("info");
  });

  it("should include extra data fields in JSON output", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    logger.info("with data", { userId: "user-1", orgId: "org-1" });

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.userId).toBe("user-1");
    expect(parsed.orgId).toBe("org-1");
  });

  it("should output error level via stdout in production mode", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    logger.error("error occurred", { error: "Something broke" });

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("error occurred");
    expect(parsed.error).toBe("Something broke");
  });

  it("should output warn level via stdout in production mode", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    logger.warn("warning message");

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("warning message");
  });

  it("should output debug level via stdout in production mode", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    logger.debug("debug message");

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe("debug");
    expect(parsed.message).toBe("debug message");
  });

  // ======================================================================
  // child() context inheritance
  // ======================================================================

  it("should inherit parent context via child()", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    const parent = logger.child({ orgId: "org-42" });
    const child = parent.child({ userId: "user-7" });
    child.info("child message");

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    // Both parent's orgId and child's userId should appear
    expect(parsed.orgId).toBe("org-42");
    expect(parsed.userId).toBe("user-7");
    expect(parsed.message).toBe("child message");
  });

  it("should allow child to override parent context", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    const parent = logger.child({ requestId: "original-id" });
    const child = parent.child({ requestId: "new-id" });
    child.info("override test");

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.requestId).toBe("new-id");
  });

  it("should not mutate parent context when child is created", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    const parent = logger.child({ orgId: "org-42" });
    parent.child({ userId: "user-7" });
    parent.info("parent message");

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.orgId).toBe("org-42");
    expect(parsed.userId).toBeUndefined();
  });

  // ======================================================================
  // Development mode tests (console.log/error)
  // ======================================================================

  it("should use console.log for info in development mode", async () => {
    process.env.NODE_ENV = "development";

    const { logger } = await import("@/lib/logger");
    logger.info("dev info");

    expect(consoleLogSpy).toHaveBeenCalled();
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });

  it("should use console.error for error in development mode", async () => {
    process.env.NODE_ENV = "development";

    const { logger } = await import("@/lib/logger");
    logger.error("dev error");

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });

  it("should use console.warn for warn in development mode", async () => {
    process.env.NODE_ENV = "development";

    const { logger } = await import("@/lib/logger");
    logger.warn("dev warn");

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });

  // ======================================================================
  // Error handling
  // ======================================================================

  it("should include error stack trace when passed in data", async () => {
    process.env.NODE_ENV = "production";

    const { logger } = await import("@/lib/logger");
    const testError = new Error("Something went wrong");
    logger.error("operation failed", {
      error: testError.message,
      stack: testError.stack,
    });

    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe("Something went wrong");
    expect(parsed.stack).toBeDefined();
  });

  // ======================================================================
  // Test mode (NODE_ENV=test) — should behave like development
  // ======================================================================

  it("should use console.log in test mode (NODE_ENV=test)", async () => {
    process.env.NODE_ENV = "test";

    const { logger } = await import("@/lib/logger");
    logger.info("test info");

    expect(consoleLogSpy).toHaveBeenCalled();
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });
});
