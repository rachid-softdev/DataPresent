import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Factories for External Services
// Used in integration tests to simulate Stripe, BullMQ, AI, S3, Email.
// ---------------------------------------------------------------------------

/**
 * Create a mock Stripe SDK instance.
 */
export function createMockStripe() {
  return {
    checkout: {
      sessions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "cs_test_mock_123",
          mode: "subscription",
          customer_email: "test@example.com",
          metadata: { orgId: "org_mock_123", plan: "pro" },
          customer: "cus_mock_123",
          subscription: "sub_mock_123",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_mock_123",
            mode: "subscription",
            customer_email: "test@example.com",
            metadata: { orgId: "org_mock_123", plan: "pro" },
            customer: "cus_mock_123",
            subscription: "sub_mock_123",
          },
        },
      }),
    },
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_mock_123" }),
    },
    subscriptions: {
      update: vi.fn().mockResolvedValue({ id: "sub_mock_123" }),
    },
  };
}

/**
 * Create a mock Bull Queue instance.
 */
export function createMockBullQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: "mock-job-123", name: "export", data: {} }),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
}

/**
 * Create a mock Anthropic SDK instance.
 */
export function createMockAnthropic() {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        id: "msg_mock_123",
        content: [{ text: "Mock AI response for testing", type: "text" }],
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  };
}

/**
 * Create a mock S3 client instance.
 */
export function createMockS3() {
  return {
    send: vi.fn().mockResolvedValue({}),
  };
}

/**
 * Create a mock Nodemailer transport.
 */
export function createMockNodemailer() {
  return {
    sendMail: vi.fn().mockResolvedValue({ messageId: "mock-email-id" }),
    verify: vi.fn().mockResolvedValue(true),
  };
}
