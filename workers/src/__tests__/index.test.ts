// ==========================================
// Workers Entry Point — Phase 1 Tests
// ==========================================
//
// Tests for workers/src/index.ts:
// - Module imports without crashing
// - env.ts validates correctly with proper env vars
// - env.ts throws with invalid env vars
// - isFeatureEnabled works based on env vars
// - Health HTTP endpoint returns proper JSON
// - Graceful shutdown closes workers and server

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ===========================================================================
// Top-level mocks — all vi.mock calls must use hoisted variables
// ===========================================================================
const mockInitSentry = vi.hoisted(() => vi.fn());
const mockGetGenerateWorker = vi.hoisted(() => vi.fn());
const mockGetExportWorker = vi.hoisted(() => vi.fn());
const mockGenerateClose = vi.hoisted(() => vi.fn());
const mockExportClose = vi.hoisted(() => vi.fn());
const mockCreateServer = vi.hoisted(() => vi.fn());
const mockServerListen = vi.hoisted(() => vi.fn());
const mockServerClose = vi.hoisted(() => vi.fn());
const capturedHandler = vi.hoisted(() => ({ current: null as ((req: any, res: any) => void) | null }));

// Track process listeners for shutdown tests
const processListeners = vi.hoisted(() => ({}) as Record<string, () => void>);

vi.mock("../sentry.js", () => ({
  initSentry: mockInitSentry,
}));

vi.mock("../workers/generate.worker.js", () => ({
  getGenerateWorker: mockGetGenerateWorker,
}));

vi.mock("../workers/export.worker.js", () => ({
  getExportWorker: mockGetExportWorker,
}));

vi.mock("node:http", () => ({
  createServer: mockCreateServer,
}));

// ===========================================================================
// Helpers
// ===========================================================================
const ORIGINAL_ENV = { ...process.env };

function setupWorkerMocks() {
  mockGenerateClose.mockResolvedValue(undefined);
  mockExportClose.mockResolvedValue(undefined);
  mockGetGenerateWorker.mockResolvedValue({ close: mockGenerateClose });
  mockGetExportWorker.mockResolvedValue({ close: mockExportClose });
  capturedHandler.current = null;
  mockCreateServer.mockImplementation((handler: any) => {
    capturedHandler.current = handler;
    return {
      listen: mockServerListen,
      close: mockServerClose,
      on: vi.fn(),
    };
  });
  mockServerListen.mockImplementation((_port: any, _host: any, cb: any) => {
    if (cb) cb();
  });
  // close() must invoke its callback for the shutdown Promise to resolve
  mockServerClose.mockImplementation((cb: any) => {
    if (cb) cb();
  });
}

// ===========================================================================
// env.ts Validation Tests
// ===========================================================================
describe("env.ts validation", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("should parse env vars successfully with all required fields", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    const { env } = await import("../env.js");

    expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/testdb");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-12345678abcdef");
    expect(env.JOB_SIGNING_SECRET).toBe("a".repeat(32));
  });

  it("should apply defaults for optional fields when not explicitly set", async () => {
    // Unset NODE_ENV so the default 'development' applies
    delete process.env.NODE_ENV;
    delete process.env.REDIS_TLS_ENABLED;
    delete process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    const { env } = await import("../env.js");

    expect(env.NODE_ENV).toBe("development");
    expect(env.REDIS_TLS_ENABLED).toBe("false");
    expect(env.REDIS_TLS_REJECT_UNAUTHORIZED).toBe("true");
  });

  it("should parse NODE_ENV=test correctly", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    const { env } = await import("../env.js");

    expect(env.NODE_ENV).toBe("test");
  });

  it("should throw when DATABASE_URL is not a valid URL", async () => {
    process.env.DATABASE_URL = "not-a-valid-url";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    await expect(async () => {
      await import("../env.js");
    }).rejects.toThrow("Invalid environment variables");
  });

  it("should throw when ANTHROPIC_API_KEY is too short", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "short"; // less than 8 chars
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    await expect(async () => {
      await import("../env.js");
    }).rejects.toThrow("Invalid environment variables");
  });

  it("should throw when JOB_SIGNING_SECRET is too short", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "short"; // less than 32 chars

    vi.resetModules();
    await expect(async () => {
      await import("../env.js");
    }).rejects.toThrow("Invalid environment variables");
  });

  it("should throw when DATABASE_URL is missing", async () => {
    // Don't set DATABASE_URL
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    await expect(async () => {
      await import("../env.js");
    }).rejects.toThrow("Invalid environment variables");
  });
});

describe("isFeatureEnabled", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("should return true for r2 when all R2 env vars are set", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);
    process.env.R2_ACCOUNT_ID = "acct-123";
    process.env.R2_ACCESS_KEY_ID = "key-123";
    process.env.R2_SECRET_ACCESS_KEY = "secret-123";

    vi.resetModules();
    const { isFeatureEnabled } = await import("../env.js");
    expect(isFeatureEnabled("r2")).toBe(true);
  });

  it("should return false for r2 when R2 env vars are missing", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    const { isFeatureEnabled } = await import("../env.js");
    expect(isFeatureEnabled("r2")).toBe(false);
  });

  it("should return true for sentry when SENTRY_DSN is set", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);
    process.env.SENTRY_DSN = "https://key@o123.ingest.sentry.io/123";

    vi.resetModules();
    const { isFeatureEnabled } = await import("../env.js");
    expect(isFeatureEnabled("sentry")).toBe(true);
  });

  it("should return false for sentry when SENTRY_DSN is missing", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    const { isFeatureEnabled } = await import("../env.js");
    expect(isFeatureEnabled("sentry")).toBe(false);
  });

  it("should return true for redis when REDIS_URL is set", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);
    process.env.REDIS_URL = "redis://localhost:6379";

    vi.resetModules();
    const { isFeatureEnabled } = await import("../env.js");
    expect(isFeatureEnabled("redis")).toBe(true);
  });

  it("should return false for unknown feature", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);

    vi.resetModules();
    const { isFeatureEnabled } = await import("../env.js");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isFeatureEnabled("unknown" as any)).toBe(false);
  });
});

// ===========================================================================
// index.ts Entry Point Tests
// ===========================================================================
describe("index.ts entry point", () => {
  const indexEnv = { ...process.env };

  beforeAll(() => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
    process.env.ANTHROPIC_API_KEY = "sk-ant-12345678abcdef";
    process.env.JOB_SIGNING_SECRET = "a".repeat(32);
    process.env.PORT = "0";
  });

  afterAll(() => {
    process.env = { ...indexEnv };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupWorkerMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("module import", () => {
    it("should import module without crashing when dependencies are mocked", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          /* noop */
        }) as any);

      const mod = await import("../index.js");
      expect(mod).toBeDefined();
      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockInitSentry).toHaveBeenCalledOnce();
    });

    it("should call initSentry on startup", async () => {
      vi.spyOn(process, "exit").mockImplementation((() => {
        /* noop */
      }) as any);

      await import("../index.js");
      expect(mockInitSentry).toHaveBeenCalledOnce();
    });

    it("should create both generate and export workers on startup", async () => {
      vi.spyOn(process, "exit").mockImplementation((() => {
        /* noop */
      }) as any);

      await import("../index.js");

      expect(mockGetGenerateWorker).toHaveBeenCalledOnce();
      expect(mockGetExportWorker).toHaveBeenCalledOnce();
    });
  });

  describe("health HTTP endpoint", () => {
    it("should respond with healthy status JSON on GET /health", async () => {
      vi.spyOn(process, "exit").mockImplementation((() => {
        /* noop */
      }) as any);

      await import("../index.js");

      expect(capturedHandler.current).not.toBeNull();
      expect(mockServerListen).toHaveBeenCalledWith(0, "0.0.0.0", expect.any(Function));

      // Test health endpoint
      const mockWriteHead = vi.fn();
      const mockEnd = vi.fn();
      const healthReq = { method: "GET", url: "/health" };
      const healthRes = {
        writeHead: mockWriteHead,
        end: mockEnd,
      };

      capturedHandler.current!(healthReq, healthRes);

      expect(mockWriteHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });

      const responseBody = JSON.parse(mockEnd.mock.calls[0][0]);
      expect(responseBody.status).toBe("healthy");
      expect(responseBody.workers).toBeDefined();
      expect(responseBody.workers.generate).toBe("running");
      expect(responseBody.workers.export).toBe("running");
      expect(responseBody.uptime).toBeGreaterThanOrEqual(0);
      expect(responseBody.timestamp).toBeDefined();
    });

    it("should respond with text on GET /", async () => {
      vi.spyOn(process, "exit").mockImplementation((() => {
        /* noop */
      }) as any);

      await import("../index.js");

      const mockWriteHead = vi.fn();
      const mockEnd = vi.fn();
      const rootReq = { method: "GET", url: "/" };
      const rootRes = {
        writeHead: mockWriteHead,
        end: mockEnd,
      };

      capturedHandler.current!(rootReq, rootRes);

      expect(mockWriteHead).toHaveBeenCalledWith(200, {
        "Content-Type": "text/plain",
      });
      expect(mockEnd).toHaveBeenCalledWith("DataPresent Workers");
    });

    it("should respond with 404 for unknown routes", async () => {
      vi.spyOn(process, "exit").mockImplementation((() => {
        /* noop */
      }) as any);

      await import("../index.js");

      const mockWriteHead = vi.fn();
      const mockEnd = vi.fn();
      const unknownReq = { method: "GET", url: "/unknown" };
      const unknownRes = {
        writeHead: mockWriteHead,
        end: mockEnd,
      };

      capturedHandler.current!(unknownReq, unknownRes);

      expect(mockWriteHead).toHaveBeenCalledWith(404);
      expect(mockEnd).toHaveBeenCalledWith("Not Found");
    });
  });

  describe("graceful shutdown", () => {
    it("should close server and workers on SIGTERM", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          /* noop */
        }) as any);

      const processOnSpy = vi
        .spyOn(process, "on")
        .mockImplementation(((
          event: string,
          listener: (...args: unknown[]) => unknown
        ) => {
          processListeners[event] = listener as () => void;
          return process;
        }) as any);

      await import("../index.js");

      expect(processListeners["SIGTERM"]).toBeDefined();
      // The listener is () => shutdown('SIGTERM') which returns a Promise
      // Await it so we wait for the async shutdown to complete (including process.exit)
      await processListeners["SIGTERM"]();

      expect(mockServerClose).toHaveBeenCalled();
      expect(mockGenerateClose).toHaveBeenCalled();
      expect(mockExportClose).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("should close server and workers on SIGINT", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          /* noop */
        }) as any);

      const processOnSpy = vi
        .spyOn(process, "on")
        .mockImplementation(((
          event: string,
          listener: (...args: unknown[]) => unknown
        ) => {
          processListeners[event] = listener as () => void;
          return process;
        }) as any);

      await import("../index.js");

      expect(processListeners["SIGINT"]).toBeDefined();
      await processListeners["SIGINT"]();

      expect(mockServerClose).toHaveBeenCalled();
      expect(mockGenerateClose).toHaveBeenCalled();
      expect(mockExportClose).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});
