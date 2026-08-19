// ==========================================
// GET /api/me/entitlements
// Returns current user's entitlements (cached 60s)
//
// Query params:
//   ?orgId=<id>  — optional: resolve entitlements for a specific org the
//                  user belongs to (multi-org users). Falls back to the
//                  first membership when omitted.
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedOrgId = request.nextUrl.searchParams.get("orgId");

    // Get user's organizations (all memberships)
    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id },
      select: { orgId: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Resolve the org: explicit ?orgId= must be one of the user's orgs
    // (never trust a client-supplied orgId outside the membership list),
    // otherwise fall back to the first membership.
    const orgId = requestedOrgId
      ? memberships.find((m) => m.orgId === requestedOrgId)?.orgId
      : memberships[0].orgId;

    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const userId = session.user.id;

    // Get entitlements
    const entitlements = await getAllEntitlements(orgId, userId);

    // Transform for client (serialize dates)
    const response = {
      plan: entitlements.plan,
      features: entitlements.features,
      limits: entitlements.limits,
      usage: entitlements.usage,
      resetAt: Object.fromEntries(
        Object.entries(entitlements.resetAt).map(([k, v]) => [k, v?.toISOString() ?? null]),
      ),
    };

    // Cache headers (60 seconds) — MUST be private: the payload is
    // user-specific (user overrides are applied server-side). A public/shared
    // cache could serve one user's override state to another user.
    const responseHeaders = new Headers();
    responseHeaders.set("Cache-Control", "private, max-age=60, stale-while-revalidate=30");

    return NextResponse.json(response, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[entitlements] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
