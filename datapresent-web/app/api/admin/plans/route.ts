// ==========================================
// GET /api/admin/plans
// POST /api/admin/plans/:planKey/features
// Admin only
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { entitlementRepository } from "@/lib/entitlements/repository";
import { prisma } from "@/lib/prisma";
import type { Plan, DowngradeStrategy } from "@prisma/client";

// GET all plans with their features
export const GET = withAdmin(
  async (req) => {
    const plans: Plan[] = ["FREE", "PRO", "TEAM", "AGENCY"];

    // Get all features
    const allFeatures = await prisma.feature.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
    });

    // Build plan features map
    const result = await Promise.all(
      plans.map(async (plan) => {
        const planFeatures = await entitlementRepository.getPlanFeatures(plan);

        return {
          plan,
          features: allFeatures.map((f) => {
            const pf = planFeatures.find((p) => p.featureId === f.id);
            return {
              featureKey: f.key,
              enabled: pf?.enabled ?? false,
              limitValue: pf?.limitValue ?? null,
              configJson: pf?.configJson,
              downgradeStrategy: pf?.downgradeStrategy ?? "GRACEFUL",
            };
          }),
        };
      }),
    );

    return NextResponse.json({ data: result });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);

// POST - Add/update feature for a plan
export const POST = withAdmin(
  async (req) => {
    const body = await req.json();
    const { planKey, featureKey, enabled, limitValue, configJson, downgradeStrategy } = body;

    if (!planKey || !featureKey) {
      return NextResponse.json(
        { error: "Missing required fields: planKey, featureKey" },
        { status: 400 },
      );
    }

    // Validate plan
    if (!["FREE", "PRO", "TEAM", "AGENCY"].includes(planKey)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get feature
    const feature = await prisma.feature.findUnique({
      where: { key: featureKey },
    });

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Upsert plan feature
    const planFeature = await prisma.planFeature.upsert({
      where: {
        plan_featureId: {
          plan: planKey as Plan,
          featureId: feature.id,
        },
      },
      create: {
        plan: planKey as Plan,
        featureId: feature.id,
        enabled: enabled ?? false,
        limitValue: limitValue ?? null,
        configJson: configJson ?? null,
        downgradeStrategy: (downgradeStrategy as DowngradeStrategy) ?? "GRACEFUL",
      },
      update: {
        enabled: enabled ?? undefined,
        limitValue: limitValue ?? undefined,
        configJson: configJson ?? undefined,
        downgradeStrategy: (downgradeStrategy as DowngradeStrategy) ?? undefined,
      },
    });

    return NextResponse.json(planFeature);
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);
