import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLimit } from "@/lib/entitlements/feature-gate";
import { badRequest, ERROR_CODES, forbidden, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getGenerateQueue } from "@/lib/queue";
import { signJobData } from "@/lib/queue/job-security";
import { isValidSector } from "@/lib/sector";
import { withCsrfProtection } from "@/lib/security";
import { logApiError } from "@/lib/security/error-logger";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id: reportId } = await params;
  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        org: { include: { members: true } },
        sourceFile: true,
      },
    });

    if (!report) {
      return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND);
    }

    const isMember = report.org.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return forbidden();
    }

    if (!report.sourceFile) {
      return badRequest(ERROR_CODES.ERR_RESOURCE_NO_SOURCE_FILE);
    }

    if (report.status === "PROCESSING") {
      return badRequest(ERROR_CODES.ERR_RESOURCE_ALREADY_GENERATING);
    }

    const { sector, slideCount: rawSlideCount } = await req.json().catch(() => ({}));

    // Coerce the optional slideCount override; invalid values fall back to the
    // worker default instead of reaching the AI layer as negative counts.
    const parsedSlideCount = Number(rawSlideCount);
    const slideCount =
      rawSlideCount !== undefined && Number.isInteger(parsedSlideCount) && parsedSlideCount >= 1
        ? parsedSlideCount
        : undefined;

    // Validate the effective slide count against the plan before enqueueing
    // (mirrors the worker backstop; avoids flipping the report to ERROR).
    const maxSlides = await getLimit(report.org.id, "maxSlides");
    const requestedCount = slideCount ?? 10;
    if (maxSlides !== null && requestedCount > maxSlides) {
      return NextResponse.json(
        { error: `Limite de ${maxSlides} slides atteinte pour ce rapport.` },
        { status: 403 },
      );
    }

    const updateData: Prisma.ReportUpdateInput = {
      status: "PENDING",
      title: report.title,
    };

    if (sector) {
      if (!isValidSector(sector)) {
        return badRequest(ERROR_CODES.ERR_VALIDATION_REQUIRED);
      }
      updateData.sector = sector;
    }

    await prisma.report.update({
      where: { id: reportId },
      data: updateData,
    });

    // NOTE: slides are intentionally NOT deleted here — the worker snapshots the
    // current slides into a ReportVersion and swaps them atomically, so a failed
    // regeneration no longer destroys the existing deck.

    // SECURITY: Sign job data with userId
    const signedJob = signJobData({
      reportId,
      userId: session.user.id,
      ...(slideCount && { slideCount }),
    });
    const generateQueue = await getGenerateQueue();
    await generateQueue.add("generate", signedJob);

    return NextResponse.json({
      reportId,
      status: "PENDING",
    });
  } catch (error) {
    await logApiError(error as Error, {
      path: `/api/reports/${reportId}/regenerate`,
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
