// ==========================================
// Middleware Factories - Framework-Agnostic
// ==========================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeature, canConsume, consume, type ConsumeResult } from "@/lib/entitlements";
import type { NextRequest } from "next/server";

// ==========================================
// Helper: Extract orgId and userId from session
// ==========================================

async function getSessionContext(_request: NextRequest): Promise<{
  orgId: string | null;
  userId: string | null;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { orgId: null, userId: null };
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { orgId: true },
  });

  return {
    orgId: membership?.orgId ?? null,
    userId: session.user.id,
  };
}

// ==========================================
// Error Response Helpers
// ==========================================

function createFeatureErrorResponse(featureKey: string, currentPlan: string): Response {
  return Response.json(
    {
      error: "FEATURE_NOT_AVAILABLE",
      feature: featureKey,
      plan_required: "PRO",
      current_plan: currentPlan,
      upgrade_url: "/billing/upgrade",
    },
    { status: 403 },
  );
}

function createLimitErrorResponse(
  featureKey: string,
  limit: number,
  used: number,
  resetAt: Date | null,
): Response {
  return Response.json(
    {
      error: "LIMIT_REACHED",
      feature: featureKey,
      limit,
      used,
      reset_at: resetAt?.toISOString() ?? null,
      upgrade_url: "/billing/upgrade",
    },
    { status: 402 },
  );
}

// ==========================================
// Middleware Factory: requireFeature
// ==========================================

/**
 * Middleware that checks if a feature is available
 * Throws 403 if not available
 *
 * Usage Next.js App Router:
 *   export const POST = withFeature("EXPORT_PDF")(handler)
 *
 * Usage API Routes:
 *   router.post("/export", requireFeature("EXPORT_PDF"), handler)
 */
export function createFeatureMiddleware(featureKey: string) {
  return async (
    request: NextRequest,
  ): Promise<{
    allowed: boolean;
    orgId: string | null;
    userId: string | null;
  }> => {
    const { orgId, userId } = await getSessionContext(request);

    if (!orgId) {
      return { allowed: false, orgId: null, userId: null };
    }

    const allowed = await hasFeature(orgId, featureKey, userId ?? undefined);

    return { allowed, orgId, userId };
  };
}

/**
 * Wrapper that adds feature check to a Next.js App Router handler
 */
export function withFeature(
  featureKey: string,
  handler: (request: NextRequest, context: { orgId: string; userId: string }) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    const { allowed, orgId, userId } = await createFeatureMiddleware(featureKey)(request);

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!allowed) {
      return createFeatureErrorResponse(featureKey, "FREE");
    }

    return handler(request, { orgId: orgId!, userId: userId! });
  };
}

// ==========================================
// Middleware Factory: requireLimit
// ==========================================

/**
 * Middleware that checks if consumption is allowed (without consuming)
 * Returns check result
 */
export function createLimitMiddleware(featureKey: string) {
  return async (
    request: NextRequest,
    amount: number = 1,
  ): Promise<{
    allowed: boolean;
    orgId: string | null;
    userId: string | null;
  }> => {
    const { orgId, userId } = await getSessionContext(request);

    if (!orgId) {
      return { allowed: false, orgId: null, userId: null };
    }

    const allowed = await canConsume(orgId, featureKey, amount, userId ?? undefined);

    return { allowed, orgId, userId };
  };
}

/**
 * Wrapper for Next.js App Router - check limit without consuming
 */
export function withLimit(
  featureKey: string,
  handler: (request: NextRequest, context: { orgId: string; userId: string }) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    const { allowed, orgId, userId } = await createLimitMiddleware(featureKey)(request, 1);

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!allowed) {
      // Get current usage for error response
      const entitlements = await import("@/lib/entitlements").then((m) =>
        m.getAllEntitlements(orgId, userId ?? undefined),
      );

      const limit = entitlements.limits[featureKey] ?? 0;
      const used = entitlements.usage[featureKey] ?? 0;
      const resetAt = entitlements.resetAt[featureKey];

      return createLimitErrorResponse(featureKey, limit, used, resetAt);
    }

    return handler(request, { orgId: orgId!, userId: userId! });
  };
}

// ==========================================
// Middleware Factory: consumeFeature
// ==========================================

/**
 * Middleware that checks AND consumes the feature quota
 * Returns consume result
 */
export function createConsumeMiddleware(featureKey: string, amount: number = 1) {
  return async (
    request: NextRequest,
  ): Promise<{
    result: ConsumeResult;
    orgId: string | null;
    userId: string | null;
  }> => {
    const { orgId, userId } = await getSessionContext(request);

    if (!orgId) {
      return {
        result: {
          success: false,
          error: "FEATURE_NOT_AVAILABLE",
          featureKey,
          limit: null,
          used: 0,
          resetAt: null,
        },
        orgId: null,
        userId: null,
      };
    }

    const result = await consume(orgId, featureKey, amount, userId ?? undefined);

    return { result, orgId, userId };
  };
}

/**
 * Wrapper for Next.js App Router - check + consume in one
 */
export function withConsume(
  featureKey: string,
  amount: number = 1,
  handler: (
    request: NextRequest,
    context: { orgId: string; userId: string; consumeResult: ConsumeResult },
  ) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    const { result, orgId, userId } = await createConsumeMiddleware(featureKey, amount)(request);

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!result.success) {
      if (result.error === "FEATURE_NOT_AVAILABLE") {
        return createFeatureErrorResponse(featureKey, "FREE");
      }

      return createLimitErrorResponse(featureKey, result.limit ?? 0, result.used, result.resetAt);
    }

    return handler(request, {
      orgId: orgId!,
      userId: userId!,
      consumeResult: result,
    });
  };
}
