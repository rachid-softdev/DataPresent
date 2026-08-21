// ==========================================
// DELETE /api/admin/overrides/:id
// Admin only
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { invalidateCache } from "@/lib/entitlements/feature-gate";
import { entitlementRepository } from "@/lib/entitlements/repository";
import { prisma } from "@/lib/prisma";

export const DELETE = withAdmin(
  async (_req, { params }) => {
    const { id } = await params;

    const override = await prisma.entitlementOverride.findUnique({
      where: { id },
      select: { scope: true, scopeId: true },
    });

    if (!override) {
      return NextResponse.json({ error: "Override not found" }, { status: 404 });
    }

    await entitlementRepository.deleteOverride(id);

    // Invalidate cache
    if (override.scope === "ORG") {
      await invalidateCache(override.scopeId);
    }

    return NextResponse.json({ success: true });
  },
  { rateLimit: { limit: 120, windowMs: 60 * 1000 } },
);
