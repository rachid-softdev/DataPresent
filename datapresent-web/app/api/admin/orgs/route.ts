// ==========================================
// GET /api/admin/orgs
// List all organizations with plan + member/report counts (admin only)
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const GET = withAdmin(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: { select: { plan: true, status: true } },
          _count: { select: { members: true, reports: true } },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return NextResponse.json({
      data: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.subscription?.plan ?? "FREE",
        subscriptionStatus: org.subscription?.status ?? null,
        memberCount: org._count.members,
        reportCount: org._count.reports,
        createdAt: org.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { rateLimit: { limit: 120, windowMs: 60 * 1000 } },
);
