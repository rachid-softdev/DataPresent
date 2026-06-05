import { vi } from "vitest";

// ==========================================
// Integration Test Setup
// Stubs env vars to satisfy env.ts Zod schema
// Mocks external SDKs (Stripe, BullMQ, AI, etc.)
// ==========================================

// 1. Stub environment variables
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv(
  "DATABASE_URL",
  process.env.DATABASE_URL || "postgresql://datapresent:test@localhost:5432/datapresent_test",
);
vi.stubEnv("REDIS_URL", process.env.REDIS_URL || "redis://localhost:6379");
vi.stubEnv("NEXTAUTH_SECRET", "nextauth-integration-secret-min-32-chars!!!");
vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
vi.stubEnv("CSRF_SECRET", "csrf-integration-secret-min-32-chars!!!!");
vi.stubEnv("JOB_SIGNING_SECRET", "job-signing-integration-secret-32ch");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-integration-test-key-12345678");
vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_placeholder_key_12345");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder_key_123456");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder_webhook_secret");

// 2. Mock external SDKs
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
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
  })),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "mock-job-123", name: "export", data: {} }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
  Job: {
    fn: {},
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        id: "msg_mock_123",
        content: [{ text: "Mock AI response for testing", type: "text" }],
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "mock-email-id" }),
      verify: vi.fn().mockResolvedValue(true),
    }),
  },
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: "mock-email-id" }),
    verify: vi.fn().mockResolvedValue(true),
  }),
}));
