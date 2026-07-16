// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    magicLinkToken: {
      findUnique: mockFindUnique,
      update: vi.fn(),
    },
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

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

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn().mockImplementation(() => ({
    name: "magic-link",
    type: "credentials",
  })),
}));

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export auth handlers", async () => {
    const mod = await import("@/lib/auth");
    expect(module).toBeDefined();
    expect(module.handlers).toBeDefined();
    expect(module.auth).toBeDefined();
    expect(module.signIn).toBeDefined();
    expect(module.signOut).toBeDefined();
  });
});
