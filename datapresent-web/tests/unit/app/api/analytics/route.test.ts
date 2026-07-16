// @vitest-environment node
// ==========================================
// Analytics API Route Tests (Horizon 6)
// ==========================================
//
// Tests for app/api/analytics/route.ts:
// - POST with valid event returns 200
// - POST with missing event returns 400
// - POST with disallowed event returns 403
// - POST with invalid JSON returns 500
// - Only REPORT_EXPORTED is allowed from clients

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
const mockTrackEvent = vi.hoisted(() => vi.fn());
const mockJson = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  NextResponse: {
    json: mockJson,
  },
  NextRequest: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: mockTrackEvent,
  ANALYTICS_EVENTS: {
    USER_SIGNUP: "user.signup",
    REPORT_CREATED: "report.created",
    REPORT_EXPORTED: "report.exported",
    SUBSCRIPTION_CHANGED: "subscription.changed",
  },
}));

import { POST } from "@/app/api/analytics/route";

function createMockRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: new Headers(),
  });
}

describe("Analytics API route (POST /api/analytics)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });
    mockTrackEvent.mockResolvedValue(undefined);
  });

  // ======================================================================
  // Missing event field
  // ======================================================================

  it("should return 400 when event field is missing", async () => {
    const req = createMockRequest({ properties: { key: "val" } });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: event");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should return 400 when event is an empty string", async () => {
    const req = createMockRequest({ event: "" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: event");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should return 400 when event is not a string", async () => {
    const req = createMockRequest({ event: 123 });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: event");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should return 400 when body is empty", async () => {
    const req = createMockRequest({});

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: event");
  });

  // ======================================================================
  // Disallowed events
  // ======================================================================

  it("should return 403 for user.signup event from client", async () => {
    const req = createMockRequest({ event: "user.signup" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not allowed from clients");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should return 403 for report.created event from client", async () => {
    const req = createMockRequest({ event: "report.created" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not allowed from clients");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should return 403 for subscription.changed event from client", async () => {
    const req = createMockRequest({ event: "subscription.changed" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not allowed from clients");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should return 403 for unknown event string", async () => {
    const req = createMockRequest({ event: "some.random.event" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not allowed from clients");
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  // ======================================================================
  // Valid event (report.exported)
  // ======================================================================

  it("should return 200 for report.exported event", async () => {
    const req = createMockRequest({ event: "report.exported" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it("should pass event and properties to trackEvent", async () => {
    const req = createMockRequest({
      event: "report.exported",
      properties: { reportId: "rpt_123", format: "PDF" },
    });

    await POST(req);

    expect(mockTrackEvent).toHaveBeenCalledWith("report.exported", {
      reportId: "rpt_123",
      format: "PDF",
    });
  });

  it("should work without properties field", async () => {
    const req = createMockRequest({ event: "report.exported" });

    await POST(req);

    expect(mockTrackEvent).toHaveBeenCalledWith("report.exported", undefined);
  });

  it("should handle empty properties object", async () => {
    const req = createMockRequest({
      event: "report.exported",
      properties: {},
    });

    await POST(req);

    expect(mockTrackEvent).toHaveBeenCalledWith("report.exported", {});
  });

  // ======================================================================
  // Error handling
  // ======================================================================

  it("should return 500 when JSON parsing fails", async () => {
    const req = new Request("http://localhost:3000/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{{{",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return 500 when trackEvent throws", async () => {
    mockTrackEvent.mockRejectedValue(new Error("Tracking error"));

    const req = createMockRequest({ event: "report.exported" });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
