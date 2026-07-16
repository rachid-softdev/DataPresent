// ==========================================
// Stripe Webhook Error Details Test (Fix #5)
// ==========================================
//
// Tests that the stripe webhook handler does NOT expose internal
// error details to the caller. Previously the error response may
// have included err.message or result.error. After the fix, only
// a generic "Webhook processing failed" message is returned.

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockJson = vi.hoisted(() => vi.fn());
const mockConstructWebhookEvent = vi.hoisted(() => vi.fn());
const mockHandleWebhookEvent = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  NextResponse: {
    json: mockJson,
  },
  NextRequest: vi.fn(),
}));

vi.mock("@/lib/stripe-webhook-handler", () => ({
  constructWebhookEvent: mockConstructWebhookEvent,
  handleWebhookEvent: mockHandleWebhookEvent,
}));

// ---------------------------------------------------------------------------
// Mock errors
// ---------------------------------------------------------------------------
vi.mock("@/lib/errors", () => ({
  ERROR_CODES: {
    ERR_RESOURCE_INVALID_SIGNATURE: "errors.resource.invalidSignature",
  },
  badRequest: vi.fn((code: string) => {
    const headers = new Headers();
    return new Response(JSON.stringify({ error: code }), {
      status: 400,
      headers,
    });
  }),
}));

import { NextRequest } from "next/server";
// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------
import { POST } from "@/app/[locale]/api/stripe/webhook/route";

describe("Stripe Webhook Error Details (Fix #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Create a minimal mock NextRequest for webhook testing
   */
  function createMockWebhookRequest(body: string, signature?: string): NextRequest {
    const headers = new Headers();
    if (signature) {
      headers.set("stripe-signature", signature);
    }
    return {
      method: "POST",
      text: vi.fn().mockResolvedValue(body),
      headers,
    } as unknown as NextRequest;
  }

  it("should return generic error message when webhook processing fails", async () => {
    // Arrange: Valid signature but processing fails
    mockConstructWebhookEvent.mockReturnValue({ type: "checkout.session.completed" });
    mockHandleWebhookEvent.mockResolvedValue({
      success: false,
      error: new Error("INTERNAL_DB_FAILURE: connection refused on replica-2") as any,
    });
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });

    const req = createMockWebhookRequest('{"mock":"body"}', "valid_signature");

    // Act
    const response = await POST(req);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("Webhook processing failed");

    // CRITICAL: Must NOT leak internal details
    expect(data.error).not.toContain("INTERNAL_DB_FAILURE");
    expect(data.error).not.toContain("connection refused");
    expect(data.error).not.toContain("replica-2");
    expect(data).not.toHaveProperty("details");
    expect(data).not.toHaveProperty("stack");
    expect(data).not.toHaveProperty("message");
  });

  it("should return generic error when signature verification fails", async () => {
    // Arrange: Invalid signature
    mockConstructWebhookEvent.mockImplementation(() => {
      throw new Error("Stripe signature verification failed: ticket#12345");
    });
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });

    const req = createMockWebhookRequest('{"mock":"body"}', "bad_signature");

    // Act
    const response = await POST(req);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error");
    // Must NOT leak the verification error details
    expect(JSON.stringify(data)).not.toContain("ticket#12345");
    expect(JSON.stringify(data)).not.toContain("Stripe signature");
  });

  it("should not expose stack traces in error responses", async () => {
    // Arrange
    mockConstructWebhookEvent.mockReturnValue({ type: "checkout.session.completed" });
    mockHandleWebhookEvent.mockResolvedValue({
      success: false,
      error: new Error("Something went wrong") as any,
    });
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });

    const req = createMockWebhookRequest('{"mock":"body"}', "valid_signature");

    // Act
    const response = await POST(req);
    const body = await response.text();

    // Assert: No stack traces in response body
    expect(body).not.toContain("at ");
    expect(body).not.toContain("Error:");
    expect(body).not.toContain("StackTrace");
    expect(body).not.toContain("\\n");
  });

  it("should return success response when processing works", async () => {
    // Arrange: Happy path
    mockConstructWebhookEvent.mockReturnValue({ type: "checkout.session.completed" });
    mockHandleWebhookEvent.mockResolvedValue({ success: true });
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });

    const req = createMockWebhookRequest('{"mock":"body"}', "valid_signature");

    // Act
    const response = await POST(req);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should return 400 when stripe-signature header is missing", async () => {
    // Arrange: No signature header
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });

    const req = createMockWebhookRequest('{"mock":"body"}'); // no signature

    // Act
    const response = await POST(req);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe("errors.resource.invalidSignature");
  });
});
