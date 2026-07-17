// ==========================================
// Analytics / Event Tracking Tests (Horizon 6)
// ==========================================
//
// Tests for lib/analytics.ts:
// - ANALYTICS_EVENTS constant structure
// - trackEvent() calls logger.info with correct shape
// - Properties are spread correctly

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the logger module BEFORE importing analytics
// Use vi.hoisted to define mock function at the hoisted scope level
const mockLoggerInfo = vi.hoisted(() => vi.fn());

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  },
}));

import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

describe("Analytics (lib/analytics.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ======================================================================
  // ANALYTICS_EVENTS constants
  // ======================================================================

  it("should define all expected analytics events", () => {
    expect(ANALYTICS_EVENTS).toEqual({
      USER_SIGNUP: "user.signup",
      REPORT_CREATED: "report.created",
      REPORT_EXPORTED: "report.exported",
      SUBSCRIPTION_CHANGED: "subscription.changed",
    });
  });

  it("all event values should be non-empty strings", () => {
    const values = Object.values(ANALYTICS_EVENTS);
    expect(values.length).toBe(4);
    for (const v of values) {
      expect(v).toBeTruthy();
      expect(typeof v).toBe("string");
    }
  });

  // ======================================================================
  // trackEvent() — logger integration
  // ======================================================================

  it("should call logger.info for any event", async () => {
    await trackEvent(ANALYTICS_EVENTS.USER_SIGNUP, { userId: "usr_123" });

    expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
  });

  it("should pass 'analytics' as the log message", async () => {
    await trackEvent(ANALYTICS_EVENTS.REPORT_CREATED);

    expect(mockLoggerInfo).toHaveBeenCalledWith("analytics", expect.any(Object));
  });

  it("should include event field in the entry", async () => {
    await trackEvent(ANALYTICS_EVENTS.USER_SIGNUP);

    const entry = mockLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
    expect(entry.event).toBe("user.signup");
  });

  it("should include type='analytics' in the entry", async () => {
    await trackEvent(ANALYTICS_EVENTS.REPORT_EXPORTED);

    const entry = mockLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
    expect(entry.type).toBe("analytics");
  });

  it("should include ISO timestamp in the entry", async () => {
    await trackEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CHANGED);

    const entry = mockLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
    expect(entry.timestamp).toBeDefined();
    expect(typeof entry.timestamp).toBe("string");
    expect(() => new Date(entry.timestamp as string)).not.toThrow();
    expect(new Date(entry.timestamp as string).toISOString()).toBe(entry.timestamp);
  });

  it("should spread custom properties into the entry", async () => {
    await trackEvent(ANALYTICS_EVENTS.REPORT_EXPORTED, {
      reportId: "rpt_456",
      format: "PDF",
      orgId: "org_789",
    });

    const entry = mockLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
    expect(entry.reportId).toBe("rpt_456");
    expect(entry.format).toBe("PDF");
    expect(entry.orgId).toBe("org_789");
  });

  it("should work with no properties argument", async () => {
    await trackEvent(ANALYTICS_EVENTS.REPORT_CREATED);

    expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
    const entry = mockLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
    expect(entry.event).toBe("report.created");
  });

  it("should accept all event types", async () => {
    for (const event of Object.values(ANALYTICS_EVENTS)) {
      mockLoggerInfo.mockClear();
      await trackEvent(event);
      expect(mockLoggerInfo).toHaveBeenCalledWith("analytics", expect.objectContaining({ event }));
    }
  });

  it("should not mutate the ANALYTICS_EVENTS object", () => {
    const originalKeys = Object.keys(ANALYTICS_EVENTS);
    expect(originalKeys).toEqual([
      "USER_SIGNUP",
      "REPORT_CREATED",
      "REPORT_EXPORTED",
      "SUBSCRIPTION_CHANGED",
    ]);
  });
});
