import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, ERROR_CODES, forbidden, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { sanitizeComment } from "@/lib/sanitize";
import { withCsrfProtection } from "@/lib/security";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;
  const { body } = await req.json();

  if (!body?.trim()) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_COMMENT_REQUIRED);
  }

  if (typeof body !== "string" || body.length > 5000) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_COMMENT_REQUIRED);
  }

  const sanitizedBody = sanitizeComment(body.trim());

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return notFound();
  }

  if (comment.authorId !== session.user.id) {
    return forbidden();
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body: sanitizedBody },
    include: {
      author: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return notFound();
  }

  if (comment.authorId !== session.user.id) {
    return forbidden();
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return NextResponse.json({ success: true });
}
