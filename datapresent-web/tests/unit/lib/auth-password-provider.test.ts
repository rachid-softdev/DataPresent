// ==========================================
// Auth Password Provider Tests
// ==========================================
//
// Tests the password-based CredentialsProvider (id: "password")
// added to lib/auth.ts for email+password login.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Capture CredentialsProvider calls so we can test the password authorize fn
// ---------------------------------------------------------------------------
const capturedProviders: Array<{ id: string; authorize: (...args: unknown[]) => unknown }> = [];

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: any) => {
    capturedProviders.push(config);
    return { ...config, type: "credentials" };
  }),
}));

// Mock Prisma
const mockFindUnique = vi.fn();
const mockPrisma = {
  user: { findUnique: mockFindUnique },
  password: { findUnique: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock auth dependencies
vi.mock("next-auth", () => ({
  default: vi.fn().mockReturnValue({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  verifyToken: vi.fn(),
  extractTokenPrefix: vi.fn(),
}));

// Mock password module for verifyPassword
const mockVerifyPassword = vi.fn();

vi.mock("@/lib/password", () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: vi.fn(),
}));

let passwordAuthorize: ((...args: unknown[]) => unknown) | null = null;

describe("Auth — Password CredentialsProvider", () => {
  beforeAll(async () => {
    // Load auth module to trigger provider registrations
    await import("@/lib/auth");

    // Find the password provider (id: "password")
    const provider = capturedProviders.find((p) => p.id === "password");
    if (!provider) {
      throw new Error("Password CredentialsProvider not found — was it added to lib/auth.ts?");
    }
    passwordAuthorize = provider.authorize;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Valid credentials
  // -----------------------------------------------------------------------
  it("should return user for valid email+password", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "Test@Example.com",
      name: "Test User",
    });
    mockPrisma.password.findUnique.mockResolvedValue({ hash: "hashed-password" });
    mockVerifyPassword.mockResolvedValue(true);

    const result = await passwordAuthorize!({
      email: "Test@Example.com",
      password: "CorrectP@ss123",
    });

    expect(result).toEqual({
      id: "user-1",
      email: "Test@Example.com",
      name: "Test User",
    });
  });

  // -----------------------------------------------------------------------
  // Wrong password
  // -----------------------------------------------------------------------
  it("should return null for wrong password", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
    });
    mockPrisma.password.findUnique.mockResolvedValue({ hash: "hashed-password" });
    mockVerifyPassword.mockResolvedValue(false);

    const result = await passwordAuthorize!({
      email: "test@example.com",
      password: "WrongP@ss123",
    });

    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Unknown email
  // -----------------------------------------------------------------------
  it("should return null for unknown email", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await passwordAuthorize!({
      email: "unknown@example.com",
      password: "AnyP@ss1234",
    });

    expect(result).toBeNull();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // User has no password set
  // -----------------------------------------------------------------------
  it("should return null if user has no password set", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
    });
    mockPrisma.password.findUnique.mockResolvedValue(null);

    const result = await passwordAuthorize!({
      email: "test@example.com",
      password: "AnyP@ss1234",
    });

    expect(result).toBeNull();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Missing credentials
  // -----------------------------------------------------------------------
  it("should return null when email is missing", async () => {
    const result = await passwordAuthorize!({
      email: "",
      password: "SomeP@ss1234",
    });

    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("should return null when password is missing", async () => {
    const result = await passwordAuthorize!({
      email: "test@example.com",
      password: "",
    });

    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("should return null when both credentials are missing", async () => {
    const result = await passwordAuthorize!({});

    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Email normalization
  // -----------------------------------------------------------------------
  it("should normalize email to lowercase when looking up user", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
    });
    mockPrisma.password.findUnique.mockResolvedValue({ hash: "hashed-password" });
    mockVerifyPassword.mockResolvedValue(true);

    await passwordAuthorize!({
      email: "TEST@EXAMPLE.COM",
      password: "CorrectP@ss123",
    });

    // The user lookup should use the lowercased email
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
  });

  it("should normalize email with mixed case and trim whitespace", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
    });
    mockPrisma.password.findUnique.mockResolvedValue({ hash: "hashed-password" });
    mockVerifyPassword.mockResolvedValue(true);

    await passwordAuthorize!({
      email: "  User@Example.COM  ",
      password: "CorrectP@ss123",
    });

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
  });
});
