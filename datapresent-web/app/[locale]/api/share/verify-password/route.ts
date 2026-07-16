import { NextRequest, NextResponse } from "next/server";
import { extractClientIP } from "@/lib/client-ip";
import { notFound, unauthorized } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/share/verify-password
 * Verify the password for a shared report
 */
export async function POST(req: NextRequest) {
  try {
    const { shareToken, password } = await req.json();

    if (!shareToken || !password) {
      return NextResponse.json({ error: "errors.validation.required" }, { status: 400 });
    }

    // Rate limiting: 10 attempts per hour per share token + IP
    const ip = extractClientIP(req) ?? "unknown";
    const allowed = await checkRateLimit(`share-verify:${shareToken}:${ip}`, {
      limit: 10,
      windowMs: 3600000,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const report = await prisma.report.findUnique({
      where: { shareToken, isPublic: true },
      include: {
        slides: { orderBy: { position: "asc" } },
        org: { include: { subscription: true } },
      },
    });

    if (!report) {
      return notFound();
    }

    // Check if link has expired
    if (report.shareExpiresAt && new Date() > report.shareExpiresAt) {
      return NextResponse.json({ error: "errors.resource.expired" }, { status: 410 });
    }

    // If no password is set, allow access
    if (!report.sharePassword) {
      const plan = report.org.subscription?.plan || "FREE";
      return NextResponse.json({
        report: {
          id: report.id,
          title: report.title,
          sector: report.sector,
          slides: report.slides.map((slide) => ({
            id: slide.id,
            position: slide.position,
            title: slide.title,
            layout: slide.layout,
            contentJson: slide.contentJson,
            speakerNotes: slide.speakerNotes,
          })),
          isWatermarked: plan === "FREE",
        },
      });
    }

    // Verify the password
    const isValid = await verifyPassword(password, report.sharePassword);

    if (!isValid) {
      return NextResponse.json({ error: "errors.validation.invalidPassword" }, { status: 401 });
    }

    // Password is correct, return the report
    const plan = report.org.subscription?.plan || "FREE";

    return NextResponse.json({
      report: {
        id: report.id,
        title: report.title,
        sector: report.sector,
        slides: report.slides.map((slide) => ({
          id: slide.id,
          position: slide.position,
          title: slide.title,
          layout: slide.layout,
          contentJson: slide.contentJson,
          speakerNotes: slide.speakerNotes,
        })),
        isWatermarked: plan === "FREE",
      },
    });
  } catch (error) {
    console.error("Error verifying share password:", error);
    return NextResponse.json({ error: "errors.generic" }, { status: 500 });
  }
}
