// ==========================================
// V1 Reports API Route Tests (Horizon 6)
// ==========================================
//
// Tests for app/api/v1/reports/route.ts:
// - Returns 401 when not authenticated
// - Returns 404 when user has no organization
// - Returns 200 with paginated ReportDTOs
// - Pagination parameters (cursor, limit)
// - Error handling

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
const mockAuth = vi.hoisted(() => vi.fn());
const mockPrismaMembershipFindFirst = vi.hoisted(() => vi.fn());
const mockPrismaReportFindMany = vi.hoisted(() => vi.fn());
const mockPrismaReportCount = vi.hoisted(() => vi.fn());
const mockToReportDTO = vi.hoisted(() => vi.fn());
const mockBuildPaginatedQuery = vi.hoisted(() => vi.fn());
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
    membership: {
      findFirst: mockPrismaMembershipFindFirst,
    },
    report: {
      findMany: mockPrismaReportFindMany,
      count: mockPrismaReportCount,
    },
  },
}));

vi.mock("@/lib/dto", () => ({
  toReportDTO: mockToReportDTO,
  buildPaginatedQuery: mockBuildPaginatedQuery,
}));

import { GET } from "@/app/api/v1/reports/route";

describe("V1 Reports API route (/api/v1/reports)", () => {
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

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should not query membership when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await GET(new Request("http://localhost:3000/api/v1/reports"));

    expect(mockPrismaMembershipFindFirst).not.toHaveBeenCalled();
  });

  // ======================================================================
  // No organization (404)
  // ======================================================================

  it("should return 404 when user has no organization membership", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("No organization found");
  });

  it("should query membership with correct user ID", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_456" } });
    mockPrismaMembershipFindFirst.mockResolvedValue(null);

    await GET(new Request("http://localhost:3000/api/v1/reports"));

    expect(mockPrismaMembershipFindFirst).toHaveBeenCalledWith({
      where: { userId: "user_456" },
      select: { orgId: true },
    });
  });

  // ======================================================================
  // Success with pagination (200)
  // ======================================================================

  it("should return 200 with paginated reports", async () => {
    const mockReports = [
      { id: "rpt_1", title: "Report 1" },
      { id: "rpt_2", title: "Report 2" },
    ];
    const mockDTOs = [
      { id: "rpt_1", title: "Report 1 DTO" },
      { id: "rpt_2", title: "Report 2 DTO" },
    ];
    const mockPaginatedResult = {
      items: mockReports,
      hasMore: false,
      nextCursor: null,
      totalCount: 2,
    };

    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue(mockPaginatedResult);
    mockToReportDTO.mockImplementation((r: { id: string; title: string }) => ({
      id: r.id,
      title: `${r.title} DTO`,
    }));

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual(mockDTOs);
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBeNull();
    expect(data.totalCount).toBe(2);
  });

  it("should pass correct orgId to buildPaginatedQuery via model wrapper", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    });

    await GET(new Request("http://localhost:3000/api/v1/reports"));

    const callArg = mockBuildPaginatedQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.model).toBeDefined();
    // The model wrapper functions capture orgId from the closure.
    // The route spreads args and then sets where: { orgId: membership.orgId },
    // which overrides any where from args (intentional for security).
    const wrapper = callArg.model as {
      findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
      count: (args: Record<string, unknown>) => Promise<number>;
    };
    await wrapper.findMany({ skip: 10 });
    expect(mockPrismaReportFindMany).toHaveBeenCalledWith({
      skip: 10,
      where: { orgId: "org_789" },
    });

    // Verify count wrapper also has orgId filter
    await wrapper.count({});
    expect(mockPrismaReportCount).toHaveBeenCalledWith({
      where: { orgId: "org_789" },
    });
  });

  it("should apply default limit of 20 when no limit param", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    });

    await GET(new Request("http://localhost:3000/api/v1/reports"));

    const callArg = mockBuildPaginatedQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.limit).toBe(20);
  });

  it("should apply custom limit from query params", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    });

    await GET(new Request("http://localhost:3000/api/v1/reports?limit=10"));

    const callArg = mockBuildPaginatedQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.limit).toBe(10);
  });

  it("should cap limit at 100 when over max", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    });

    await GET(new Request("http://localhost:3000/api/v1/reports?limit=999"));

    const callArg = mockBuildPaginatedQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.limit).toBe(100);
  });

  it("should floor limit at 1 when below minimum", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    });

    await GET(new Request("http://localhost:3000/api/v1/reports?limit=-5"));

    const callArg = mockBuildPaginatedQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.limit).toBe(1);
  });

  it("should pass cursor param to buildPaginatedQuery", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    });

    await GET(new Request("http://localhost:3000/api/v1/reports?cursor=abc123"));

    const callArg = mockBuildPaginatedQuery.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.cursor).toBe("abc123");
  });

  it("should map items through toReportDTO", async () => {
    const mockReports = [
      { id: "rpt_1", title: "Report 1", createdAt: new Date(), orgId: "org_789" },
    ];
    const mockDTO = { id: "rpt_1", title: "Report 1 DTO" };

    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: mockReports,
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
    });
    mockToReportDTO.mockReturnValue(mockDTO);

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    // Array.map passes (item, index, array) - verify first arg is the report
    expect(mockToReportDTO).toHaveBeenCalledWith(
      mockReports[0],
      expect.any(Number),
      expect.any(Array),
    );
    expect(data.items).toContainEqual(mockDTO);
  });

  it("should return hasMore=true and nextCursor when there are more results", async () => {
    const mockReports = Array(21)
      .fill(null)
      .map((_, i) => ({
        id: `rpt_${i}`,
        title: `Report ${i}`,
      }));

    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockResolvedValue({
      items: mockReports.slice(0, 20),
      hasMore: true,
      nextCursor: "next_page_cursor",
      totalCount: 100,
    });
    mockToReportDTO.mockImplementation((r: { id: string; title: string }) => ({ ...r }));

    const response = await GET(new Request("http://localhost:3000/api/v1/reports?limit=20"));
    const data = await response.json();

    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBe("next_page_cursor");
    expect(data.totalCount).toBe(100);
    expect(data.items.length).toBe(20);
  });

  // ======================================================================
  // Error handling
  // ======================================================================

  it("should return 500 when auth check fails", async () => {
    mockAuth.mockRejectedValue(new Error("Auth error"));

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return 500 when buildPaginatedQuery fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user_123" } });
    mockPrismaMembershipFindFirst.mockResolvedValue({ orgId: "org_789" });
    mockBuildPaginatedQuery.mockRejectedValue(new Error("Query failed"));

    const response = await GET(new Request("http://localhost:3000/api/v1/reports"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
