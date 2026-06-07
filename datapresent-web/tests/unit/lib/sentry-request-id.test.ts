// ==========================================
// Sentry Request ID Tests (Item 13)
// ==========================================
//
// Tests for lib/sentry.ts:
// - setRequestId calls Sentry.setTag in production
// - setRequestId does nothing in dev/test
// - configureRequestScope reads x-request-id header

import { describe, it, expect, vi, afterEach } from "vitest";

describe("Sentry setRequestId (lib/sentry.ts)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should call Sentry.setTag with request_id in production", async () => {
    process.env.NODE_ENV = "production";

    const mockSetTag = vi.fn();
    vi.doMock("@sentry/nextjs", () => ({
      setTag: mockSetTag,
      init: vi.fn(),
      captureException: vi.fn(),
      captureMessage: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUser: vi.fn(),
      startSpan: vi.fn(),
      httpIntegration: vi.fn(),
      moduleIntegration: vi.fn(),
    }));

    // Use vi.resetModules to ensure fresh import with doMock
    vi.resetModules();
    const { setRequestId } = await import("@/lib/sentry");
    setRequestId("req-123");

    expect(mockSetTag).toHaveBeenCalledWith("request_id", "req-123");
  });

  it("should NOT call Sentry.setTag in development mode", async () => {
    process.env.NODE_ENV = "development";

    const mockSetTag = vi.fn();
    vi.doMock("@sentry/nextjs", () => ({
      setTag: mockSetTag,
    }));

    vi.resetModules();
    const { setRequestId } = await import("@/lib/sentry");
    setRequestId("req-123");

    expect(mockSetTag).not.toHaveBeenCalled();
  });

  it("should NOT call Sentry.setTag in test mode", async () => {
    process.env.NODE_ENV = "test";

    const mockSetTag = vi.fn();
    vi.doMock("@sentry/nextjs", () => ({
      setTag: mockSetTag,
    }));

    vi.resetModules();
    const { setRequestId } = await import("@/lib/sentry");
    setRequestId("req-123");

    expect(mockSetTag).not.toHaveBeenCalled();
  });

  it("should configure request scope from NextRequest headers in production", async () => {
    process.env.NODE_ENV = "production";

    const mockSetTag = vi.fn();
    vi.doMock("@sentry/nextjs", () => ({
      setTag: mockSetTag,
      init: vi.fn(),
      captureException: vi.fn(),
      captureMessage: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUser: vi.fn(),
      startSpan: vi.fn(),
      httpIntegration: vi.fn(),
      moduleIntegration: vi.fn(),
    }));

    vi.resetModules();
    const { configureRequestScope } = await import("@/lib/sentry");

    const mockRequest = {
      headers: new Headers({ "x-request-id": "header-req-id" }),
    };
    configureRequestScope(mockRequest as any);

    expect(mockSetTag).toHaveBeenCalledWith("request_id", "header-req-id");
  });

  it("should not call Sentry when x-request-id header is missing", async () => {
    process.env.NODE_ENV = "production";

    const mockSetTag = vi.fn();
    vi.doMock("@sentry/nextjs", () => ({
      setTag: mockSetTag,
    }));

    vi.resetModules();
    const { configureRequestScope } = await import("@/lib/sentry");

    const mockRequest = {
      headers: new Headers(), // no x-request-id header
    };
    configureRequestScope(mockRequest as any);

    expect(mockSetTag).not.toHaveBeenCalled();
  });
});
