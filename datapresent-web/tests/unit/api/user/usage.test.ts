// @vitest-environment node
// ==========================================
// Regression — GET /api/user/usage
// ==========================================
// Pins the usage/limits payload contract:
// - unauthenticated -> 401 marker, no DB access
// - no organization -> 400 NO_ORGANIZATION marker
// - reports used/limit/remaining mirror entitlements, remaining clamped at 0
// - null limits -> -1 "unlimited" sentinel (reports + slides)
// - slides.limit comes from entitlements.limits.maxSlides
// - exports.thisMonth counts this month's exports per format
// - no subscription -> FREE plan with its pricing name

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetAllEntitlements = vi.hoisted(() => vi.fn());
const mockGetPlanPricing = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaExportFindMany = vi.hoisted(() => vi.fn());

const errors = vi.hoisted(() => {
  const codes = {
    ERR_AUTH_UNAUTHORIZED: "errors.auth.unauthorized",
    ERR_RESOURCE_NO_ORGANIZATION: "errors.resource.noOrganization",
  };
  return {
    codes,
    badRequest: vi.fn((code: string) => ({ status: 400, body: { error: code } })),
    unauthorized: vi.fn(() => ({ status: 401, body: { error: codes.ERR_AUTH_UNAUTHORIZED } })),
  };
});

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/entitlements/feature-gate", () => ({
  getAllEntitlements: mockGetAllEntitlements,
}));
vi.mock("@/lib/entitlements/plan-pricing", () => ({ getPlanPricing: mockGetPlanPricing }));
vi.mock("@/lib/errors", () => ({
  badRequest: errors.badRequest,
  unauthorized: errors.unauthorized,
  ERROR_CODES: errors.codes,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockPrismaUserFindUnique },
    export: { findMany: mockPrismaExportFindMany },
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

import { GET } from "@/app/[locale]/api/user/usage/route";

interface UsageBody {
  plan: string;
  planName: string;
  reports: { used: number; limit: number; remaining: number };
  slides: { used: number; limit: number };
  members: number;
  exports: { thisMonth: { PPTX: number; PDF: number; DOCX: number } };
}

interface OrgFixture {
  id: string;
  subscription: { plan: string } | null;
  members: Array<{ id: string }>;
}

const PLAN_NAMES: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
  ULTRA: "Ultra",
};

function makeOrg(overrides: Partial<OrgFixture> = {}): OrgFixture {
  return {
    id: "org-1",
    subscription: overrides.subscription === undefined ? { plan: "PRO" } : overrides.subscription,
    members: overrides.members ?? [{ id: "member-1" }, { id: "member-2" }, { id: "member-3" }],
  };
}

function makeDbUser(org: OrgFixture | null = makeOrg()) {
  return { id: "user-1", membership: org ? [{ org }] : [] };
}

const unauthenticatedCases: Array<[string, unknown]> = [
  ["a null session", null],
  ["an empty session object", {}],
  ["a session whose user has no id", { user: {} }],
];

describe("GET /api/user/usage — usage/limits payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockPrismaUserFindUnique.mockResolvedValue(makeDbUser());
    mockGetAllEntitlements.mockResolvedValue({
      usage: { reportsPerMonth: 7 },
      limits: { reportsPerMonth: 5, maxSlides: 30 },
    });
    mockGetPlanPricing.mockImplementation((plan: string) => ({ name: PLAN_NAMES[plan] ?? plan }));
    mockPrismaExportFindMany.mockResolvedValue([]);
  });

  it.each(
    unauthenticatedCases,
  )("returns the 401 marker and never queries prisma with %s", async (_label, session) => {
    mockAuth.mockResolvedValue(session);

    const res = (await GET()) as { status: number; body: { error: string } };

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: errors.codes.ERR_AUTH_UNAUTHORIZED });
    expect(errors.unauthorized).toHaveBeenCalledTimes(1);
    expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
    expect(mockGetAllEntitlements).not.toHaveBeenCalled();
    expect(mockPrismaExportFindMany).not.toHaveBeenCalled();
  });

  it("returns the 400 NO_ORGANIZATION marker when the user has no membership", async () => {
    mockPrismaUserFindUnique.mockResolvedValue(makeDbUser(null));

    const res = (await GET()) as { status: number; body: { error: string } };

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: errors.codes.ERR_RESOURCE_NO_ORGANIZATION });
    expect(errors.badRequest).toHaveBeenCalledWith(errors.codes.ERR_RESOURCE_NO_ORGANIZATION);
    expect(mockGetAllEntitlements).not.toHaveBeenCalled();
    expect(mockPrismaExportFindMany).not.toHaveBeenCalled();
  });

  it("reports entitlement usage/limit and clamps remaining at 0 (used 7 / limit 5)", async () => {
    mockGetAllEntitlements.mockResolvedValue({
      usage: { reportsPerMonth: 7 },
      limits: { reportsPerMonth: 5, maxSlides: 30 },
    });

    await GET();

    expect(mockGetAllEntitlements).toHaveBeenCalledWith("org-1");
    expect(lastStatus).toBe(200);
    const body = lastBody as UsageBody;
    expect(body.plan).toBe("PRO");
    expect(body.planName).toBe("Pro");
    expect(mockGetPlanPricing).toHaveBeenCalledWith("PRO");
    expect(body.reports).toEqual({ used: 7, limit: 5, remaining: 0 });
  });

  it("returns -1 sentinels for unlimited reports and slides", async () => {
    mockGetAllEntitlements.mockResolvedValue({
      usage: { reportsPerMonth: 2 },
      limits: { reportsPerMonth: null, maxSlides: null },
    });

    await GET();

    const body = lastBody as UsageBody;
    expect(body.reports).toEqual({ used: 2, limit: -1, remaining: -1 });
    expect(body.slides).toEqual({ used: 0, limit: -1 });
  });

  it("exposes slides.limit from entitlements.limits.maxSlides", async () => {
    mockGetAllEntitlements.mockResolvedValue({
      usage: { reportsPerMonth: 1 },
      limits: { reportsPerMonth: 5, maxSlides: 30 },
    });

    await GET();

    expect((lastBody as UsageBody).slides).toEqual({ used: 0, limit: 30 });
  });

  it("counts this month's exports per format since the first day of the month", async () => {
    vi.useFakeTimers({ now: new Date(2026, 7, 15, 12, 0, 0) });
    try {
      mockPrismaExportFindMany.mockResolvedValue([
        { format: "PPTX" },
        { format: "PPTX" },
        { format: "PDF" },
      ]);

      await GET();

      expect(mockPrismaExportFindMany).toHaveBeenCalledTimes(1);
      const args = mockPrismaExportFindMany.mock.calls[0]?.[0] as {
        where: { report: { orgId: string }; createdAt: { gte: Date } };
      };
      expect(args.where.report.orgId).toBe("org-1");
      expect(args.where.createdAt.gte.getTime()).toBe(new Date(2026, 7, 1).getTime());
      expect(lastStatus).toBe(200);
      expect((lastBody as UsageBody).exports.thisMonth).toEqual({ PPTX: 2, PDF: 1, DOCX: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to the FREE plan and its name when the org has no subscription", async () => {
    mockPrismaUserFindUnique.mockResolvedValue(
      makeDbUser(
        makeOrg({ subscription: null, members: [{ id: "member-1" }, { id: "member-2" }] }),
      ),
    );

    await GET();

    const body = lastBody as UsageBody;
    expect(body.plan).toBe("FREE");
    expect(body.planName).toBe("Free");
    expect(mockGetPlanPricing).toHaveBeenCalledWith("FREE");
    expect(body.members).toBe(2);
  });
});
