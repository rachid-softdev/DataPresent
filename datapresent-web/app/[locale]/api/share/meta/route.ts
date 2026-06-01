import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/share/meta?token=xxx
 * Get report metadata without authentication (for share page)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Rate limit: 20 requests per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitAllowed = await checkRateLimit(`share-meta:${ip}`, {
      limit: 20,
      windowMs: 60 * 1000,
    });
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const report = await prisma.report.findUnique({
      where: { shareToken: token, isPublic: true },
      select: {
        id: true,
        title: true,
        sector: true,
        sharePassword: true,
        shareExpiresAt: true,
      },
    });

    if (!report) {
      return notFound();
    }

    // Check if link has expired
    if (report.shareExpiresAt && new Date() > report.shareExpiresAt) {
      return NextResponse.json(
        { error: "This link has expired", code: "expired" },
        { status: 410 },
      );
    }

    return NextResponse.json({
      hasPassword: !!report.sharePassword,
      title: report.title,
      sector: report.sector,
    });
  } catch (error) {
    console.error("Error getting share meta:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
