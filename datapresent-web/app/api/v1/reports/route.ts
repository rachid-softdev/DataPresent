// ==========================================
// GET /api/v1/reports — List reports (paginated, DTO)
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toReportDTO, buildPaginatedQuery } from "@/lib/dto";
import { unauthorized, notFound, ERROR_CODES } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20;

    // Find user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { orgId: true },
    });

    if (!membership) {
      return notFound(ERROR_CODES.ERR_RESOURCE_NO_ORGANIZATION);
    }

    const result = await buildPaginatedQuery({
      model: {
        findMany: (args) =>
          prisma.report.findMany({
            ...args,
            where: { orgId: membership.orgId },
          }),
        count: (args) =>
          prisma.report.count({
            ...args,
            where: { orgId: membership.orgId },
          }),
      },
      cursor,
      limit,
    });

    return NextResponse.json({
      ...result,
      // Cast to satisfy toReportDTO's stricter input type; Prisma returns all fields at runtime
      items: result.items.map((item) => toReportDTO(item as Parameters<typeof toReportDTO>[0])),
    });
  } catch (error) {
    console.error("[api/v1/reports] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
