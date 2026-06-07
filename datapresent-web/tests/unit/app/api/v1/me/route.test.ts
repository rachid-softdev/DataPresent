// ==========================================
// V1 Me API Route Tests (Horizon 6)
// ==========================================
//
// Tests for app/api/v1/me/route.ts:
// - Returns 401 when not authenticated
// - Returns 404 when user not found in DB
// - Returns 200 with UserDTO when authenticated
// - Error handling

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
const mockAuth = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockToUserDTO = vi.hoisted(() => vi.fn());
const mockJson = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  NextResponse: {
    json: mockJson,
  },
  NextRequest: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockPrismaUserFindUnique,
    },
  },
}));

vi.mock("@/lib/dto", () => ({
  toUserDTO: mockToUserDTO,
}));

import { GET } from "@/app/api/v1/me/route";

describe("V1 Me API route (/api/v1/me)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });
  });

  // ======================================================================
  // Unauthorized (401)
  // ======================================================================

  it("should return 401 when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({
      user: {
        /* no id */
      },
    });

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should not query DB when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await GET(new Request("http://localhost:3000/api/v1/me"));

    expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
  });

  // ======================================================================
  // User not found (404)
  // ======================================================================

  it("should return 404 when user is not found in database", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaUserFindUnique.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should query DB with correct user ID", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_456" } });
    mockPrismaUserFindUnique.mockResolvedValue(null);

    await GET(new Request("http://localhost:3000/api/v1/me"));

    expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user_456" },
    });
  });

  // ======================================================================
  // Success (200)
  // ======================================================================

  it("should return 200 with UserDTO when user is found", async () => {
    const mockUser = {
      id: "user_123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: new Date("2024-01-01"),
      image: "https://example.com/avatar.png",
      isVerified: true,
      role: "USER",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
      password: { hash: "hashed_password" },
    };
    const mockDTO = {
      id: "user_123",
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/avatar.png",
      role: "USER",
      isVerified: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-06-01T00:00:00.000Z",
    };

    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockToUserDTO.mockReturnValue(mockDTO);

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockDTO);
    expect(mockToUserDTO).toHaveBeenCalledWith(mockUser);
  });

  it("should not expose password hash in response (relies on toUserDTO)", async () => {
    const mockUser = {
      id: "user_123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: new Date("2024-01-01"),
      image: null,
      isVerified: true,
      role: "USER",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
      password: { hash: "should_not_be_exposed" },
    };
    const safeDTO = {
      id: "user_123",
      name: "Test User",
      email: "test@example.com",
      image: null,
      role: "USER",
      isVerified: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-06-01T00:00:00.000Z",
    };

    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockToUserDTO.mockReturnValue(safeDTO);

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(data).not.toHaveProperty("password");
    expect(data).not.toHaveProperty("emailVerified");
  });

  // ======================================================================
  // Error handling
  // ======================================================================

  it("should return 500 when an unexpected error occurs", async () => {
    mockAuth.mockRejectedValue(new Error("Auth service unavailable"));

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return 500 when prisma query fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaUserFindUnique.mockRejectedValue(new Error("Database connection lost"));

    const response = await GET(new Request("http://localhost:3000/api/v1/me"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
