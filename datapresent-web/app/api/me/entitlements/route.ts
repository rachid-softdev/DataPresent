// ==========================================
// GET /api/me/entitlements
// Returns current user's entitlements (cached 60s)
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

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { org: { include: { subscription: true } } },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = membership.orgId;
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

    // Cache headers (60 seconds)
    const responseHeaders = new Headers();
    responseHeaders.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

    return NextResponse.json(response, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[entitlements] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
