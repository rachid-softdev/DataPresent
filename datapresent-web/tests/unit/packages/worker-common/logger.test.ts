// ==========================================
// Worker Common — Logger Tests (Horizon 6)
// ==========================================
//
// Tests for packages/worker-common/src/logger.ts:
// - Logger produces JSON output via console
// - child() context inheritance
// - All log levels work correctly

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import from the worker-common package (via vitest alias)
const loggerPath = "@datapresent/worker-common/logger";

describe("Worker-common Logger (packages/worker-common/src/logger.ts)", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ======================================================================
  // Logger output
  // ======================================================================

  it("should output JSON via console.log for info level", async () => {
    const { logger } = await import(loggerPath);
    logger.info("test message");

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({
      level: "info",
      message: "test message",
    });
    expect(parsed.timestamp).toBeDefined();
    expect(() => new Date(parsed.timestamp)).not.toThrow();
  });

  it("should output JSON via console.error for error level", async () => {
    const { logger } = await import(loggerPath);
    logger.error("error occurred");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("error occurred");
  });

  it("should output JSON via console.warn for warn level", async () => {
    const { logger } = await import(loggerPath);
    logger.warn("warning message");

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const output = consoleWarnSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("warning message");
  });

  it("should output JSON via console.log for debug level", async () => {
    const { logger } = await import(loggerPath);
    logger.debug("debug message");

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("debug");
    expect(parsed.message).toBe("debug message");
  });

  // ======================================================================
  // Extra data fields
  // ======================================================================

  it("should include extra data fields in JSON output", async () => {
    const { logger } = await import(loggerPath);
    logger.info("with data", { userId: "user-1", orgId: "org-1" });

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.userId).toBe("user-1");
    expect(parsed.orgId).toBe("org-1");
  });

  it("should include data even when data object is empty", async () => {
    const { logger } = await import(loggerPath);
    logger.info("empty data", {});

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.message).toBe("empty data");
    expect(parsed.level).toBe("info");
  });

  // ======================================================================
  // child() context inheritance
  // ======================================================================

  it("should inherit parent context via child()", async () => {
    const { logger } = await import(loggerPath);
    const parent = logger.child({ orgId: "org-42" });
    const child = parent.child({ userId: "user-7" });
    child.info("child message");

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.orgId).toBe("org-42");
    expect(parsed.userId).toBe("user-7");
    expect(parsed.message).toBe("child message");
  });

  it("should allow child to override parent context", async () => {
    const { logger } = await import(loggerPath);
    const parent = logger.child({ requestId: "original-id" });
    const child = parent.child({ requestId: "new-id" });
    child.info("override test");

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.requestId).toBe("new-id");
  });

  it("should not mutate parent context when child is created", async () => {
    const { logger } = await import(loggerPath);
    const parent = logger.child({ orgId: "org-42" });
    parent.child({ userId: "user-7" });
    parent.info("parent message");

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.orgId).toBe("org-42");
    expect(parsed.userId).toBeUndefined();
  });

  it("should create independent child loggers", async () => {
    const { logger } = await import(loggerPath);
    const child1 = logger.child({ context: "child1" });
    const child2 = logger.child({ context: "child2" });
    child1.info("from child1");
    child2.info("from child2");

    const output1 = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    const output2 = JSON.parse(consoleLogSpy.mock.calls[1][0] as string);
    expect(output1.context).toBe("child1");
    expect(output2.context).toBe("child2");
  });

  // ======================================================================
  // Logger singleton
  // ======================================================================

  it("should export a logger singleton", async () => {
    const mod = await import(loggerPath);
    expect(mod.logger).toBeDefined();
    expect(typeof mod.logger.info).toBe("function");
    expect(typeof mod.logger.warn).toBe("function");
    expect(typeof mod.logger.error).toBe("function");
    expect(typeof mod.logger.debug).toBe("function");
    expect(typeof mod.logger.child).toBe("function");
  });

  // ======================================================================
  // Timestamp validation
  // ======================================================================

  it("should include a valid ISO timestamp", async () => {
    const { logger } = await import(loggerPath);
    logger.info("timestamp test");

    const output = consoleLogSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.timestamp).toBeDefined();
    expect(() => new Date(parsed.timestamp)).not.toThrow();
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
  });
});
