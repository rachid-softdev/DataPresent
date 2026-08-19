// @vitest-environment node
// ==========================================
// Regression — org creation (F6: maxOrganizations) + invites (F6: collaboration)
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockWithCsrf = vi.hoisted(() => vi.fn());
const mockGetLimit = vi.hoisted(() => vi.fn());
const mockHasFeature = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockPrismaOrgFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaOrgCreate = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaMembershipFindFirst = vi.hoisted(() => vi.fn());
const mockPrismaMembershipCreate = vi.hoisted(() => vi.fn());
const mockPrismaInviteDeleteMany = vi.hoisted(() => vi.fn());
const mockPrismaInviteCreate = vi.hoisted(() => vi.fn());
const mockLogApiError = vi.hoisted(() => vi.fn());
const mockLogSecurityEvent = vi.hoisted(() => vi.fn());

const mockBadRequest = vi.hoisted(() => vi.fn());
const mockUnauthorized = vi.hoisted(() => vi.fn());
const mockForbidden = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/security", () => ({
  withCsrfProtection: mockWithCsrf,
  logApiError: mockLogApiError,
  logSecurityEvent: mockLogSecurityEvent,
}));
vi.mock("@/lib/entitlements/feature-gate", () => ({
  getLimit: mockGetLimit,
  hasFeature: mockHasFeature,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: mockPrismaOrgFindUnique, create: mockPrismaOrgCreate },
    user: { findUnique: mockPrismaUserFindUnique },
    membership: { findFirst: mockPrismaMembershipFindFirst, create: mockPrismaMembershipCreate },
    inviteToken: { deleteMany: mockPrismaInviteDeleteMany, create: mockPrismaInviteCreate },
  },
}));
vi.mock("@/lib/errors", () => ({
  badRequest: mockBadRequest,
  unauthorized: mockUnauthorized,
  forbidden: mockForbidden,
  notFound: mockNotFound,
  ERROR_CODES: {
    ERR_VALIDATION_SLUG_REQUIRED: "SLUG_REQUIRED",
    ERR_VALIDATION_SLUG_TAKEN: "SLUG_TAKEN",
    ERR_RESOURCE_FORBIDDEN: "FORBIDDEN",
    ERR_RESOURCE_NO_ORGANIZATION: "NO_ORG",
    ERR_VALIDATION_REQUIRED: "REQUIRED",
    ERR_RESOURCE_MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",
    ERR_RESOURCE_ALREADY_MEMBER: "ALREADY_MEMBER",
  },
}));
vi.mock("@/lib/crypto", () => ({
  generateToken: vi.fn(() => "raw-token"),
  hashToken: vi.fn(async () => "hashed-token"),
  extractTokenPrefix: vi.fn(() => "raw-tok"),
}));
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_BASE_URL: "http://localhost:3000" } }));

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

import { POST as InvitePOST } from "@/app/[locale]/api/organizations/[id]/invite/route";
import { POST as MembersPOST } from "@/app/[locale]/api/organizations/[id]/members/route";
import { POST as OrgPOST } from "@/app/[locale]/api/organizations/route";

function makeJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const session = { user: { id: "user-1", email: "user@example.com" } };

describe("POST /api/organizations — maxOrganizations enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue(session);
    mockWithCsrf.mockResolvedValue(null);
    mockPrismaOrgFindUnique.mockResolvedValue(null);
    mockPrismaUserFindUnique.mockResolvedValue({ id: "user-1", membership: [{ orgId: "org-1" }] });
    mockGetLimit.mockResolvedValue(1);
    mockPrismaOrgCreate.mockImplementation((args: { data: { name: string } }) =>
      Promise.resolve({
        id: "org-new",
        ...args.data,
        members: [{ userId: "user-1", role: "OWNER" }],
      }),
    );
    mockBadRequest.mockReturnValue({ status: 400, body: { error: "BAD" } });
    mockUnauthorized.mockReturnValue({ status: 401, body: { error: "UNAUTH" } });
  });

  it("returns 403 upgrade:true when org count already at maxOrganizations", async () => {
    mockGetLimit.mockResolvedValue(1); // already 1/1

    await OrgPOST(
      makeJsonRequest("http://localhost:3000/api/organizations", { name: "B", slug: "b" }),
    );

    expect(lastStatus).toBe(403);
    expect(lastBody).toEqual(
      expect.objectContaining({ upgrade: true, feature: "maxOrganizations", limit: 1, used: 1 }),
    );
    expect(mockPrismaOrgCreate).not.toHaveBeenCalled();
  });

  it("allows creation when under the limit", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ id: "user-1", membership: [] });

    await OrgPOST(
      makeJsonRequest("http://localhost:3000/api/organizations", { name: "A", slug: "a" }),
    );

    expect(lastStatus).toBe(200);
    expect(mockPrismaOrgCreate).toHaveBeenCalled();
  });

  it("allows unlimited orgs when getLimit returns null (PRO/ULTRA)", async () => {
    mockGetLimit.mockResolvedValue(null);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-1",
      membership: [{ orgId: "org-1" }, { orgId: "org-2" }, { orgId: "org-3" }],
    });

    await OrgPOST(
      makeJsonRequest("http://localhost:3000/api/organizations", { name: "C", slug: "c" }),
    );

    expect(lastStatus).toBe(200);
    expect(mockPrismaOrgCreate).toHaveBeenCalled();
  });

  it("does not check the limit when the user has no org yet", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ id: "user-1", membership: [] });

    await OrgPOST(
      makeJsonRequest("http://localhost:3000/api/organizations", { name: "A", slug: "a" }),
    );

    expect(mockGetLimit).not.toHaveBeenCalled();
    expect(lastStatus).toBe(200);
  });

  it("returns 400 when slug is already taken (before limit check)", async () => {
    mockPrismaOrgFindUnique.mockResolvedValue({ id: "existing", slug: "a" });

    const res = (await OrgPOST(
      makeJsonRequest("http://localhost:3000/api/organizations", { name: "A", slug: "a" }),
    )) as {
      status: number;
    };

    expect(res.status).toBe(400);
    expect(mockGetLimit).not.toHaveBeenCalled();
    expect(mockPrismaOrgCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/organizations/:id/invite — collaboration enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue(session);
    mockWithCsrf.mockResolvedValue(null);
    mockPrismaMembershipFindFirst.mockResolvedValue({
      id: "m1",
      userId: "user-1",
      orgId: "org-1",
      role: "OWNER",
    });
    mockHasFeature.mockResolvedValue(true);
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrismaUserFindUnique.mockResolvedValue(null);
    mockPrismaInviteDeleteMany.mockResolvedValue({ count: 0 });
    mockPrismaInviteCreate.mockResolvedValue({ id: "inv-1" });
    mockUnauthorized.mockReturnValue({ status: 401, body: { error: "UNAUTH" } });
  });

  it("returns 403 upgrade:true when collaboration is not enabled on the plan", async () => {
    mockHasFeature.mockResolvedValue(false);

    await InvitePOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/invite", {
        email: "teammate@example.com",
        role: "MEMBER",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(403);
    expect(lastBody).toEqual(expect.objectContaining({ upgrade: true }));
    expect(mockPrismaInviteCreate).not.toHaveBeenCalled();
    expect(mockPrismaInviteDeleteMany).not.toHaveBeenCalled();
  });

  it("creates the invite when collaboration is enabled", async () => {
    await InvitePOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/invite", {
        email: "teammate@example.com",
        role: "MEMBER",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(200);
    expect(mockPrismaInviteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orgId: "org-1" }) }),
    );
  });

  it("returns 403 when the user is not an admin/owner of the org", async () => {
    mockPrismaMembershipFindFirst.mockResolvedValue(null);

    await InvitePOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/invite", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(403);
    expect(mockLogSecurityEvent).toHaveBeenCalled();
    expect(mockHasFeature).not.toHaveBeenCalled();
    expect(mockPrismaInviteCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the email is already a member", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ id: "u2", email: "teammate@example.com" });
    mockPrismaMembershipFindFirst
      .mockResolvedValueOnce({ id: "m1", userId: "user-1", orgId: "org-1", role: "OWNER" }) // permission check
      .mockResolvedValueOnce({ id: "m2", userId: "u2", orgId: "org-1", role: "MEMBER" }); // existing membership

    await InvitePOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/invite", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(400);
    expect(mockPrismaInviteCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when the invite rate limit is hit", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    await InvitePOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/invite", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(429);
    expect(mockPrismaInviteCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the payload is invalid", async () => {
    await InvitePOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/invite", { role: "MEMBER" }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(400);
    expect(mockHasFeature).not.toHaveBeenCalled();
  });
});

describe("POST /api/organizations/:id/members — collaboration enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue(session);
    mockWithCsrf.mockResolvedValue(null);
    mockPrismaMembershipFindFirst.mockResolvedValue({
      id: "m1",
      userId: "user-1",
      orgId: "org-1",
      role: "ADMIN",
    });
    mockHasFeature.mockResolvedValue(true);
    mockPrismaUserFindUnique.mockResolvedValue({ id: "u2", email: "teammate@example.com" });
    mockPrismaMembershipCreate.mockResolvedValue({ id: "m2" });
    mockUnauthorized.mockReturnValue({ status: 401, body: { error: "UNAUTH" } });
    mockForbidden.mockReturnValue({ status: 403, body: { error: "FORBIDDEN" } });
    mockNotFound.mockReturnValue({ status: 404, body: { error: "NOT_FOUND" } });
  });

  it("returns 403 upgrade:true when collaboration is not enabled", async () => {
    mockHasFeature.mockResolvedValue(false);

    await MembersPOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/members", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(403);
    expect(lastBody).toEqual(expect.objectContaining({ upgrade: true, feature: "collaboration" }));
    expect(mockPrismaMembershipCreate).not.toHaveBeenCalled();
  });

  it("adds the member when collaboration is enabled", async () => {
    mockPrismaMembershipFindFirst
      .mockResolvedValueOnce({ id: "m1", userId: "user-1", orgId: "org-1", role: "ADMIN" }) // caller check
      .mockResolvedValueOnce(null); // existing member check

    await MembersPOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/members", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(lastStatus).toBe(200);
    expect(mockPrismaMembershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orgId: "org-1", userId: "u2" }) }),
    );
  });

  it("returns 403 when the caller is a plain MEMBER", async () => {
    mockPrismaMembershipFindFirst.mockResolvedValue({
      id: "m1",
      userId: "user-1",
      orgId: "org-1",
      role: "MEMBER",
    });

    await MembersPOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/members", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    );

    expect(mockHasFeature).not.toHaveBeenCalled();
    expect(mockPrismaMembershipCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user does not exist", async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null);

    const res = (await MembersPOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/members", {
        email: "ghost@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    )) as { status: number };

    expect(res.status).toBe(404);
    expect(mockPrismaMembershipCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the user is already a member", async () => {
    mockPrismaMembershipFindFirst
      .mockResolvedValueOnce({ id: "m1", userId: "user-1", orgId: "org-1", role: "ADMIN" }) // caller check
      .mockResolvedValueOnce({ id: "m2", userId: "u2", orgId: "org-1", role: "MEMBER" }); // existing check

    const res = (await MembersPOST(
      makeJsonRequest("http://localhost:3000/api/organizations/org-1/members", {
        email: "teammate@example.com",
      }),
      { params: Promise.resolve({ id: "org-1" }) },
    )) as { status: number };

    expect(res.status).toBe(400);
    expect(mockPrismaMembershipCreate).not.toHaveBeenCalled();
  });
});
