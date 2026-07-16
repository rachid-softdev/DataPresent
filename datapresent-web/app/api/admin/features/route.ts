// ==========================================
// GET /api/admin/features
// PUT /api/admin/features/:key
// POST /api/admin/features
// Admin only
// ==========================================

import type { FeatureType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// GET all features
export const GET = withAdmin(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const sort = searchParams.get("sort") ?? "key:asc";

    const skip = (page - 1) * limit;

    const [features, total] = await Promise.all([
      prisma.feature.findMany({
        skip,
        take: limit,
        orderBy: { key: "asc" },
      }),
      prisma.feature.count(),
    ]);

    return NextResponse.json({
      data: features,
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

// PUT - Update a feature
export const PUT = withAdmin(
  async (req) => {
    const body = await req.json();
    const { key, description, type, defaultConfig, isActive } = body;

    if (!key) {
      return NextResponse.json({ error: "Missing required field: key" }, { status: 400 });
    }

    const feature = await prisma.feature.update({
      where: { key },
      data: {
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type: type as FeatureType }),
        ...(defaultConfig !== undefined && { defaultConfig }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(feature);
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);

// POST - Create a new feature
export const POST = withAdmin(
  async (req) => {
    const body = await req.json();
    const { key, description, type, defaultConfig, isActive } = body;

    if (!key) {
      return NextResponse.json({ error: "Missing required field: key" }, { status: 400 });
    }

    // Check if key already exists
    const existing = await prisma.feature.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json({ error: "Feature key already exists" }, { status: 409 });
    }

    const feature = await prisma.feature.create({
      data: {
        key,
        description: description ?? null,
        type: (type as FeatureType) ?? "BOOLEAN",
        defaultConfig: defaultConfig ?? null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(feature, { status: 201 });
  },
  { rateLimit: { limit: 30, windowMs: 60 * 1000 } },
);
