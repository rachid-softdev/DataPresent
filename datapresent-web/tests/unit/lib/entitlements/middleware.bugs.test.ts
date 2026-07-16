// ==========================================
// Entitlements Middleware - Regression Tests
// ==========================================
//
// These tests lock in recently-fixed bugs in lib/entitlements/middleware.ts:
//   1. withFeature reports the org's REAL current plan (not the hardcoded "FREE").
//   2. withLimit forwards the `amount` argument to canConsume (not hardcoded 1).
//   3. withConsume's FEATURE_NOT_AVAILABLE path reports the REAL current plan.
//   4. Edge cases: unauthenticated -> 401, feature-not-allowed -> 403, consume
//      success -> handler invoked with the consume result.
//
// NOTE: the fixed middleware API is `withLimit(featureKey, amount?, handler)` and
// `withConsume(featureKey, amount?, handler)`. The current repository copy of
// middleware.ts still has the pre-fix signature for `withLimit` (no `amount`) and
// hardcodes "FREE" in the withConsume FEATURE_NOT_AVAILABLE branch. Those two tests
// are written against the fixed API (via a typed cast) so they pass once the fixes
// land, and will fail loudly against the unfixed code.

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsumeResult } from "@/lib/entitlements";
import { withConsume, withFeature, withLimit } from "@/lib/entitlements/middleware";

// ------------------------------------------
// Mocks (hoisted so vi.mock factories can reference them)
// ------------------------------------------
const hoisted = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockMembershipFindFirst: vi.fn(),
  mockSubscriptionFindUnique: vi.fn(),
  mockHasFeature: vi.fn(),
  mockCanConsume: vi.fn(),
  mockConsume: vi.fn(),
  mockGetAllEntitlements: vi.fn(),
}));

const {
  mockAuth,
  mockMembershipFindFirst,
  mockSubscriptionFindUnique,
  mockHasFeature,
  mockCanConsume,
  mockConsume,
  mockGetAllEntitlements,
} = hoisted;

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findFirst: (...args: unknown[]) => mockMembershipFindFirst(...args) },
    subscription: { findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args) },
  },
}));

vi.mock("@/lib/entitlements", () => ({
  hasFeature: (...args: unknown[]) => mockHasFeature(...args),
  canConsume: (...args: unknown[]) => mockCanConsume(...args),
  consume: (...args: unknown[]) => mockConsume(...args),
  getAllEntitlements: (...args: unknown[]) => mockGetAllEntitlements(...args),
}));

// ------------------------------------------
// Helpers
// ------------------------------------------
type HandlerContext = { orgId: string; userId: string; consumeResult?: ConsumeResult };

const fakeRequest = { url: "http://localhost" } as unknown as NextRequest;

function makeHandler(spy?: (ctx: HandlerContext) => void) {
  return vi.fn(async (_req: NextRequest, ctx: HandlerContext) => {
    spy?.(ctx);
    return Response.json({ ok: true });
  });
}

const parseBody = async (res: Response): Promise<Record<string, unknown>> => res.json();

// Fixed withLimit signature supports an optional `amount` before the handler.
type LimitHandler = (
  request: NextRequest,
  context: { orgId: string; userId: string },
) => Promise<Response>;

type WithLimitFn = {
  (featureKey: string, handler: LimitHandler): (req: NextRequest) => Promise<Response>;
  (
    featureKey: string,
    amount: number,
    handler: LimitHandler,
  ): (req: NextRequest) => Promise<Response>;
};

const withLimitTyped = withLimit as unknown as WithLimitFn;

const ORG_ID = "org-1";
const USER_ID = "user-1";

// ------------------------------------------
// Setup
// ------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();

  // Default: an authenticated user in org-1 on a PRO plan.
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  mockMembershipFindFirst.mockResolvedValue({ orgId: ORG_ID });
  mockSubscriptionFindUnique.mockResolvedValue({ plan: "PRO", status: "ACTIVE" });

  mockHasFeature.mockResolvedValue(true);
  mockCanConsume.mockResolvedValue(true);
  mockConsume.mockResolvedValue({
    success: true,
    featureKey: "EXPORT_PDF",
    previousUsage: 0,
    newUsage: 1,
    limit: 10,
    remaining: 9,
  } satisfies ConsumeResult);
  mockGetAllEntitlements.mockResolvedValue({
    plan: "PRO",
    status: "ACTIVE",
    features: {},
    limits: {},
    usage: {},
    resetAt: {},
  });
});

// ------------------------------------------
// 1. withFeature reports the REAL current plan
// ------------------------------------------
describe("withFeature - real current plan (bug fix)", () => {
  it("returns 403 with current_plan === 'PRO' (not 'FREE') when feature is not available", async () => {
    mockHasFeature.mockResolvedValue(false);

    const handler = makeHandler();
    const res = await withFeature("EXPORT_PDF", handler)(fakeRequest);

    expect(res.status).toBe(403);
    const body = await parseBody(res);
    expect(body.error).toBe("FEATURE_NOT_AVAILABLE");
    expect(body.current_plan).toBe("PRO");
    expect(body.plan_required).toBe("STARTER");
    expect(handler).not.toHaveBeenCalled();
  });
});

// ------------------------------------------
// 2. withLimit honors the amount argument
// ------------------------------------------
describe("withLimit - amount argument (bug fix)", () => {
  it("forwards the explicit amount (5) to canConsume", async () => {
    mockCanConsume.mockResolvedValue(true);

    const handler = makeHandler();
    const res = await withLimitTyped("EXPORT_PDF", 5, handler)(fakeRequest);

    expect(mockCanConsume).toHaveBeenCalledTimes(1);
    const call = mockCanConsume.mock.calls[0];
    expect(call[0]).toBe(ORG_ID);
    expect(call[1]).toBe("EXPORT_PDF");
    expect(call[2]).toBe(5);
    expect(res.status).toBe(200);
  });

  it("defaults amount to 1 when omitted", async () => {
    mockCanConsume.mockResolvedValue(true);

    const handler = makeHandler();
    const res = await withLimitTyped("EXPORT_PDF", handler)(fakeRequest);

    expect(mockCanConsume).toHaveBeenCalledTimes(1);
    const call = mockCanConsume.mock.calls[0];
    expect(call[1]).toBe("EXPORT_PDF");
    expect(call[2]).toBe(1);
    expect(res.status).toBe(200);
  });

  it("returns 402 LIMIT_REACHED with limit/used/reset_at from getAllEntitlements", async () => {
    mockCanConsume.mockResolvedValue(false);
    const resetAt = new Date("2026-08-01T00:00:00.000Z");
    mockGetAllEntitlements.mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      features: {},
      limits: { EXPORT_PDF: 10 },
      usage: { EXPORT_PDF: 10 },
      resetAt: { EXPORT_PDF: resetAt },
    });

    const handler = makeHandler();
    const res = await withLimitTyped("EXPORT_PDF", handler)(fakeRequest);

    expect(res.status).toBe(402);
    const body = await parseBody(res);
    expect(body.error).toBe("LIMIT_REACHED");
    expect(body.feature).toBe("EXPORT_PDF");
    expect(body.limit).toBe(10);
    expect(body.used).toBe(10);
    expect(body.reset_at).toBe(resetAt.toISOString());
    expect(handler).not.toHaveBeenCalled();
  });
});

// ------------------------------------------
// 3. withConsume error path uses real current plan
// ------------------------------------------
describe("withConsume - real current plan on error (bug fix)", () => {
  it("returns 403 with current_plan === 'PRO' when consume fails with FEATURE_NOT_AVAILABLE", async () => {
    mockConsume.mockResolvedValue({
      success: false,
      error: "FEATURE_NOT_AVAILABLE",
      featureKey: "EXPORT_PDF",
      limit: null,
      used: 0,
      resetAt: null,
    } satisfies ConsumeResult);

    const handler = makeHandler();
    const res = await withConsume("EXPORT_PDF", 1, handler)(fakeRequest);

    expect(res.status).toBe(403);
    const body = await parseBody(res);
    expect(body.error).toBe("FEATURE_NOT_AVAILABLE");
    expect(body.current_plan).toBe("PRO");
    expect(body.plan_required).toBe("STARTER");
    expect(handler).not.toHaveBeenCalled();
  });
});

// ------------------------------------------
// 4. Edge cases
// ------------------------------------------
describe("entitlements middleware - edge cases", () => {
  it("withFeature returns 401 when unauthenticated (no session)", async () => {
    mockAuth.mockResolvedValue(null);

    const handler = makeHandler();
    const res = await withFeature("EXPORT_PDF", handler)(fakeRequest);

    expect(res.status).toBe(401);
    const body = await parseBody(res);
    expect(body.error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
    expect(mockHasFeature).not.toHaveBeenCalled();
  });

  it("withFeature returns 403 with the correct current_plan when feature is not allowed", async () => {
    mockSubscriptionFindUnique.mockResolvedValue({ plan: "FREE", status: "ACTIVE" });
    mockHasFeature.mockResolvedValue(false);

    const handler = makeHandler();
    const res = await withFeature("EXPORT_PDF", handler)(fakeRequest);

    expect(res.status).toBe(403);
    const body = await parseBody(res);
    expect(body.current_plan).toBe("FREE");
    expect(body.plan_required).toBe("STARTER");
  });

  it("withConsume invokes the handler with the consumeResult on success", async () => {
    const consumeResult: ConsumeResult = {
      success: true,
      featureKey: "EXPORT_PDF",
      previousUsage: 2,
      newUsage: 3,
      limit: 10,
      remaining: 7,
    };
    mockConsume.mockResolvedValue(consumeResult);

    const spy = vi.fn();
    const handler = makeHandler(spy);
    const res = await withConsume("EXPORT_PDF", 1, handler)(fakeRequest);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    const ctx = spy.mock.calls[0][0];
    expect(ctx.orgId).toBe(ORG_ID);
    expect(ctx.userId).toBe(USER_ID);
    expect(ctx.consumeResult).toEqual(consumeResult);
  });
});
