// ==========================================
// Auth JWT isVerified Tests
// ==========================================
//
// Tests Fix 3: Store `isVerified` in JWT token.
// - The `jwt` callback fetches isVerified from DB on first login
// - The `session` callback reads it from the token (no DB query)
//
// The callbacks are defined inline in the NextAuth configuration within
// auth.ts. We capture the NextAuth config to extract the callbacks,
// then test them in isolation with mocked Prisma.

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Capture NextAuth config to extract callbacks
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const capturedConfigs: Array<{ callbacks: Record<string, Function> }> = [];

vi.mock("next-auth", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: vi.fn((config: any) => {
    capturedConfigs.push(config);
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

// Mock Prisma
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

// Mock other auth dependencies
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn().mockImplementation(() => ({
    name: "magic-link",
    type: "credentials",
  })),
}));

vi.mock("@/lib/crypto", () => ({
  verifyToken: vi.fn(),
  extractTokenPrefix: vi.fn(),
}));

vi.mock("@/lib/email-normalize", () => ({
  normalizeEmail: vi.fn((e: string) => e.toLowerCase().trim()),
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Extract callbacks
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
let jwtCallback: Function | null = null;
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
let sessionCallback: Function | null = null;

describe("Auth — JWT isVerified (Fix 3)", () => {
  beforeAll(async () => {
    // Load auth module to trigger NextAuth config capture
    await import("@/lib/auth");

    // Find captured callbacks
    if (capturedConfigs.length === 0) {
      throw new Error("No NextAuth config captured");
    }
    const callbacks = capturedConfigs[0].callbacks;
    jwtCallback = callbacks.jwt;
    sessionCallback = callbacks.session;

    if (!jwtCallback) throw new Error("jwt callback not found in NextAuth config");
    if (!sessionCallback) throw new Error("session callback not found in NextAuth config");
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================================
  // JWT callback tests
  // =====================================================================

  describe("jwt callback", () => {
    it("should fetch isVerified from DB and store it in token when user is provided", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        isVerified: true,
        emailVerified: new Date("2026-01-01"),
      });

      const token: Record<string, unknown> = {};

      // Act
      const result = await jwtCallback!({
        token,
        user: { id: "user-123", email: "test@example.com" },
      });

      // Assert
      expect(result.sub).toBe("user-123");
      expect(result.isVerified).toBe(true);
      expect(result.iat).toBeDefined();
      expect(typeof result.iat).toBe("number");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: { isVerified: true, emailVerified: true },
      });
    });

    it("should set isVerified based on emailVerified if isVerified is false", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        isVerified: false,
        emailVerified: new Date("2026-01-01"),
      });

      const token: Record<string, unknown> = {};

      // Act
      const result = await jwtCallback!({
        token,
        user: { id: "user-456" },
      });

      // Assert
      // emailVerified is truthy, so isVerified should be true
      expect(result.isVerified).toBe(true);
    });

    it("should set isVerified to false when both isVerified and emailVerified are null/false", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        isVerified: false,
        emailVerified: null,
      });

      const token: Record<string, unknown> = {};

      // Act
      const result = await jwtCallback!({
        token,
        user: { id: "user-789" },
      });

      // Assert
      expect(result.isVerified).toBe(false);
    });

    it("should not query DB when no user is provided (subsequent calls)", async () => {
      // Arrange
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: true,
        iat: Math.floor(Date.now() / 1000),
      };

      // Act
      const result = await jwtCallback!({ token });

      // Assert
      expect(result.isVerified).toBe(true);
      expect(mockFindUnique).not.toHaveBeenCalled(); // No DB query!
    });

    it("should re-fetch isVerified from DB on trigger='update' (never trust client data)", async () => {
      // Arrange
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: false,
        iat: Math.floor(Date.now() / 1000),
      };

      // Mock DB returns a verified user (security: server-authoritative, not client-provided)
      mockFindUnique.mockResolvedValueOnce({
        isVerified: true,
        emailVerified: new Date(),
      });

      // Act
      const result = await jwtCallback!({
        token,
        trigger: "update",
        session: { isVerified: false }, // client says "not verified" — should be ignored
      });

      // Assert
      expect(result.isVerified).toBe(true); // from DB, not from session
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: { isVerified: true, emailVerified: true },
      });
    });

    it("should preserve existing isVerified when trigger is not 'update'", async () => {
      // Arrange
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: true,
        iat: Math.floor(Date.now() / 1000),
      };

      // Act
      const result = await jwtCallback!({ token, trigger: "signIn" });

      // Assert
      expect(result.isVerified).toBe(true);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // Session callback tests
  // =====================================================================

  describe("session callback", () => {
    it("should read isVerified from token and set it on session.user WITHOUT DB query", async () => {
      // Arrange
      const session = {
        user: { id: "user-123", name: "Test User", email: "test@example.com" },
        expires: "2026-06-07",
      };
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: true,
        iat: Math.floor(Date.now() / 1000),
      };

      // Act
      const result = await sessionCallback!({ session, token });

      // Assert
      expect(result.user.isVerified).toBe(true);
      expect(result.user.id).toBe("user-123");
      // Crucial: session callback must NOT make any DB query
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should default isVerified to false when not present in token", async () => {
      // Arrange
      const session = {
        user: { id: "user-123", name: "Test User", email: "test@example.com" },
        expires: "2026-06-07",
      };
      const token: Record<string, unknown> = {
        sub: "user-123",
        // No isVerified key
        iat: Math.floor(Date.now() / 1000),
      };

      // Act
      const result = await sessionCallback!({ session, token });

      // Assert
      expect(result.user.isVerified).toBe(false);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should set isVerified to false when token.isVerified is explicitly false", async () => {
      // Arrange
      const session = {
        user: { id: "user-123", name: "Test User", email: "test@example.com" },
        expires: "2026-06-07",
      };
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: false,
        iat: Math.floor(Date.now() / 1000),
      };

      // Act
      const result = await sessionCallback!({ session, token });

      // Assert
      expect(result.user.isVerified).toBe(false);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should preserve other session.user properties", async () => {
      // Arrange
      const session = {
        user: { id: "user-123", name: "Test User", email: "test@example.com" },
        expires: "2026-06-07",
      };
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: true,
      };

      // Act
      const result = await sessionCallback!({ session, token });

      // Assert
      expect(result.user.name).toBe("Test User");
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.id).toBe("user-123");
    });

    it("should not modify session when session.user is undefined", async () => {
      // Arrange
      const session = { expires: "2026-06-07" };
      const token: Record<string, unknown> = {
        sub: "user-123",
        isVerified: true,
      };

      // Act
      const result = await sessionCallback!({ session, token });

      // Assert: session should be returned as-is (no user property to modify)
      expect(result.user).toBeUndefined();
      expect(result.expires).toBeDefined();
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("should not modify session when token.sub is missing", async () => {
      // Arrange
      const session = {
        user: { id: "user-123", name: "Test User" },
        expires: "2026-06-07",
      };
      const token: Record<string, unknown> = {
        isVerified: true,
        // No sub
      };

      // Act
      const result = await sessionCallback!({ session, token });

      // Assert
      expect(result.user.isVerified).toBeUndefined(); // Not set because token.sub is missing
      expect(result.user.id).toBe("user-123"); // Not overwritten
      expect(mockFindUnique).not.toHaveBeenCalled();
    });
  });
});
