import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ERROR_CODES, forbidden, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getGenerateQueue } from "@/lib/queue";
import { signJobData } from "@/lib/queue/job-security";
import { checkRateLimit } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  // Rate limiting: 10 generations per hour per user
  const allowed = await checkRateLimit(`generate:${session.user.id}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 });
  }
  const report = await prisma.report.findUnique({
    where: { id },
    include: { org: { include: { members: true } } },
  });

  if (!report) {
    return notFound();
  }

  const isMember = report.org.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return forbidden();
  }

  await prisma.report.update({
    where: { id },
    data: { status: "PENDING" },
  });

  // SECURITY: Sign job data with userId
  const signedJob = signJobData({
    reportId: id,
    userId: session.user.id,
  });
  const generateQueue = await getGenerateQueue();
  await generateQueue.add("generate", signedJob);

  return NextResponse.json({ success: true });
}
