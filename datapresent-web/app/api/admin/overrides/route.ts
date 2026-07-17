// ==========================================
// GET /api/admin/overrides
// POST /api/admin/overrides
// DELETE /api/admin/overrides/:id
// Admin only
// ==========================================

import type { OverrideScope, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { invalidateCache } from "@/lib/entitlements/feature-gate";
import { entitlementRepository } from "@/lib/entitlements/repository";
import { prisma } from "@/lib/prisma";

// GET all overrides
export const GET = withAdmin(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const scope = searchParams.get("scope"); // 'USER' or 'ORG'
    const scopeId = searchParams.get("scopeId");

    const skip = (page - 1) * limit;

    const where: Prisma.EntitlementOverrideWhereInput = {};

    if (scope) {
      if (!["USER", "ORG"].includes(scope)) {
        return NextResponse.json({ error: "Invalid scope filter" }, { status: 400 });
      }
      where.scope = scope as OverrideScope;
    }

    if (scopeId) {
      if (typeof scopeId !== "string" || scopeId.length > 255) {
        return NextResponse.json({ error: "Invalid scopeId" }, { status: 400 });
      }
      where.scopeId = scopeId;
    }

    const [overrides, total] = await Promise.all([
      prisma.entitlementOverride.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.entitlementOverride.count({ where }),
    ]);

    return NextResponse.json({
      data: overrides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);

// POST - Create an override
export const POST = withAdmin(
  async (req, { session }) => {
    const body = await req.json();
    const { scope, scopeId, featureKey, enabled, limitValue, expiresAt, reason } = body;

    // Validate required fields
    if (!scope || !scopeId || !featureKey || reason === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: scope, scopeId, featureKey, reason" },
        { status: 400 },
      );
    }

    if (!["USER", "ORG"].includes(scope)) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    // Verify feature exists
    const feature = await prisma.feature.findUnique({ where: { key: featureKey } });
    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Create override
    const override = await entitlementRepository.createOverride({
      scope: scope as OverrideScope,
      scopeId,
      featureKey,
      enabled: enabled ?? true,
      limitValue: limitValue ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      reason,
      createdById: session.user.id,
    });

    // Invalidate cache for the org (if org override) or user
    if (scope === "ORG") {
      await invalidateCache(scopeId);
    }

    return NextResponse.json(override, { status: 201 });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);

// DELETE - Delete an override
export const DELETE = withAdmin(
  async (req) => {
    // Extract override ID from URL (robust to trailing slashes)
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];

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
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);
