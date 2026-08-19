// @vitest-environment node
// ==========================================
// Admin API — /api/admin/features unit tests
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockExtractClientIP = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaFeatureFindMany = vi.hoisted(() => vi.fn());
const mockPrismaFeatureFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaFeatureCount = vi.hoisted(() => vi.fn());
const mockPrismaFeatureCreate = vi.hoisted(() => vi.fn());
const mockPrismaFeatureUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/client-ip", () => ({ extractClientIP: mockExtractClientIP }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockPrismaUserFindUnique },
    feature: {
      findMany: mockPrismaFeatureFindMany,
      findUnique: mockPrismaFeatureFindUnique,
      count: mockPrismaFeatureCount,
      create: mockPrismaFeatureCreate,
      update: mockPrismaFeatureUpdate,
    },
  },
}));

let lastStatus: number | undefined;
let lastBody: unknown;

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      lastBody = body;
      lastStatus = (init as { status?: number })?.status ?? 200;
      return { status: lastStatus, body };
    }),
  },
  NextRequest: vi.fn(),
}));

import { GET, POST, PUT } from "@/app/api/admin/features/route";

function makeRequest(
  method: "GET" | "POST" | "PUT",
  url = "http://localhost:3000/api/admin/features",
  body?: unknown,
): Request {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Admin API — /api/admin/features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrismaUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockCheckRateLimit.mockResolvedValue(true);
    mockExtractClientIP.mockReturnValue("1.2.3.4");

    mockPrismaFeatureFindMany.mockResolvedValue([
      { id: "f1", key: "watermark", type: "BOOLEAN", description: "x", isActive: true },
      { id: "f2", key: "reportsPerMonth", type: "LIMIT", description: "y", isActive: true },
    ]);
    mockPrismaFeatureCount.mockResolvedValue(2);
    mockPrismaFeatureFindUnique.mockResolvedValue(null);
    mockPrismaFeatureCreate.mockImplementation((args: { data: { key: string } }) =>
      Promise.resolve({ id: "new-1", ...args.data }),
    );
    mockPrismaFeatureUpdate.mockImplementation((args: { where: { key: string }; data: object }) =>
      Promise.resolve({ id: "f1", key: args.where.key, ...args.data }),
    );
  });

  it("GET returns paginated features", async () => {
    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(200);
    const body = lastBody as {
      data: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
    expect(body.data.length).toBe(2);
    expect(body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  it("GET honors page and limit params", async () => {
    await GET(makeRequest("GET", "http://localhost:3000/api/admin/features?page=2&limit=5"));

    expect(mockPrismaFeatureFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    const body = lastBody as { pagination: { page: number; limit: number } };
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(5);
  });

  it("POST creates a new feature and returns 201", async () => {
    await POST(makeRequest("POST", undefined, { key: "apiAccess", type: "BOOLEAN" }));

    expect(lastStatus).toBe(201);
    expect(mockPrismaFeatureCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ key: "apiAccess" }) }),
    );
  });

  it("POST returns 400 when the key is missing", async () => {
    await POST(makeRequest("POST", undefined, { type: "BOOLEAN" }));

    expect(lastStatus).toBe(400);
    expect(mockPrismaFeatureCreate).not.toHaveBeenCalled();
  });

  it("POST returns 409 when the feature key already exists", async () => {
    mockPrismaFeatureFindUnique.mockResolvedValue({ id: "f1", key: "watermark" });

    await POST(makeRequest("POST", undefined, { key: "watermark", type: "BOOLEAN" }));

    expect(lastStatus).toBe(409);
    expect(mockPrismaFeatureCreate).not.toHaveBeenCalled();
  });

  it("PUT updates an existing feature", async () => {
    await PUT(makeRequest("PUT", undefined, { key: "watermark", description: "updated" }));

    expect(lastStatus).toBe(200);
    expect(mockPrismaFeatureUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: "watermark" } }),
    );
  });

  it("PUT returns 400 when the key is missing", async () => {
    await PUT(makeRequest("PUT", undefined, { description: "no key" }));

    expect(lastStatus).toBe(400);
    expect(mockPrismaFeatureUpdate).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(401);
    expect(mockPrismaFeatureFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin user", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ role: "MEMBER" });

    await POST(makeRequest("POST", undefined, { key: "x" }));

    expect(lastStatus).toBe(403);
    expect(mockPrismaFeatureCreate).not.toHaveBeenCalled();
  });
});
