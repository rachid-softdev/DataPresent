// ==========================================
// GET /api/admin/orgs/:orgId/downgrade-preview
// Preview which features will be affected by downgrade (admin only)
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { getDowngradeInfo } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@prisma/client";

export const GET = withAdmin(
  async (req, { params }) => {
    const { orgId } = await params;
    const { searchParams } = new URL(req.url);
    const targetPlan = searchParams.get("targetPlan") as Plan;

    if (!targetPlan) {
      return NextResponse.json({ error: "Missing required param: targetPlan" }, { status: 400 });
    }

    // Validate target plan
    if (!["FREE", "PRO", "TEAM", "AGENCY"].includes(targetPlan)) {
      return NextResponse.json({ error: "Invalid targetPlan" }, { status: 400 });
    }

    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const info = await getDowngradeInfo(orgId, targetPlan);

    if (!info) {
      return NextResponse.json({
        message: "No downgrade needed - same or higher plan",
        orgId,
        targetPlan,
      });
    }

    return NextResponse.json(info);
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);
