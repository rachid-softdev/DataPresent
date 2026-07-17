// @vitest-environment node
// ==========================================
// Email Tests
// ==========================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    }),
  },
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "resend-id" }),
    },
  })),
}));

vi.mock("@/lib/email-templates", () => ({
  getEmailTemplate: vi.fn().mockReturnValue("<html>test</html>"),
  emailConfig: {
    magicLink: { subject: "Your Magic Link" },
    welcome: { subject: "Welcome to DataPresent" },
  },
}));

describe("email", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should export sendMagicLinkEmail function", async () => {
    const mod = await import("@/lib/email");
    expect(mod.sendMagicLinkEmail).toBeDefined();
  });

  it("should export sendWelcomeEmail function", async () => {
    const mod = await import("@/lib/email");
    expect(mod.sendWelcomeEmail).toBeDefined();
  });

  it("should log email in dev mode without provider", async () => {
    // Set dev mode
    const env = {
      ...process.env,
      NODE_ENV: "development",
      NEXTAUTH_URL: "http://localhost:3000",
    };
    process.env = env;

    const { sendMagicLinkEmail } = await import("@/lib/email");

    const result = await sendMagicLinkEmail("test@example.com", "http://example.com/magic");

    expect(result).toEqual({ id: "dev-mode", message: "Email logged to console" });
  });

  it("should throw error in production without provider", async () => {
    const env = {
      ...process.env,
      NODE_ENV: "production",
      NEXTAUTH_URL: "http://localhost:3000",
    };
    process.env = env;

    // Clear any cached modules
    vi.resetModules();

    const { sendMagicLinkEmail } = await import("@/lib/email");

    await expect(
      sendMagicLinkEmail("test@example.com", "http://example.com/magic"),
    ).rejects.toThrow("Email provider not configured");
  });

  it("should send welcome email with correct config", async () => {
    const env = {
      ...process.env,
      NODE_ENV: "development",
      NEXTAUTH_URL: "http://localhost:3000",
    };
    process.env = env;

    const { sendWelcomeEmail } = await import("@/lib/email");

    const result = await sendWelcomeEmail("test@example.com", "Test User");

    expect(result).toEqual({ id: "dev-mode", message: "Email logged to console" });
  });
});
