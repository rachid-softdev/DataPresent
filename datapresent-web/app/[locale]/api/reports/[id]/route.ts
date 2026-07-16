import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forbidden, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { withCsrfProtection } from "@/lib/security";

/**
 * GET /api/reports/[id]
 * Returns the report status for progress polling during generation
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      title: true,
      org: {
        select: {
          members: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!report) {
    return notFound();
  }

  if (!report.org.members.length) {
    return forbidden();
  }

  return NextResponse.json({
    id: report.id,
    status: report.status,
    title: report.title,
  });
}

/**
 * DELETE /api/reports/[id]
 * Delete a report and all associated data
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      org: {
        include: {
          members: { where: { userId: session.user.id } },
        },
      },
    },
  });

  if (!report) {
    return notFound();
  }

  // Only org members can delete reports
  if (!report.org.members.length) {
    return forbidden();
  }

  // Delete report and all related data (cascades via Prisma schema)
  await prisma.report.delete({
    where: { id },
  });

  return NextResponse.json({ message: "messages.reports.deleted" });
}
