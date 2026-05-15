import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, unauthorized, forbidden, notFound, badRequest } from '@/lib/errors'
import { sanitizeComment } from '@/lib/sanitize'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id: reportId } = await params

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      org: {
        include: {
          members: { where: { userId: session.user.id } }
        }
      }
    }
  })

  if (!report) {
    return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND)
  }

  if (!report.org.members.length && !report.isPublic) {
    return forbidden()
  }

  const comments = await prisma.comment.findMany({
    where: { reportId },
    include: {
      author: {
        select: { id: true, name: true, image: true, email: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json(comments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  // Rate limiting: 50 comments per hour per user
  const allowed = await checkRateLimit(`comments:${session.user.id}`, { limit: 50, windowMs: 60 * 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 })
  }

  const { id: reportId } = await params
  const { body, slideId } = await req.json()

  if (!body?.trim()) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_COMMENT_REQUIRED)
  }

  if (typeof body !== 'string' || body.length > 5000) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_COMMENT_REQUIRED)
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      org: {
        include: {
          members: { where: { userId: session.user.id } }
        }
      }
    }
  })

  if (!report) {
    return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND)
  }

  if (!report.org.members.length) {
    return forbidden()
  }

  // Sanitize the comment body to prevent XSS
  const sanitizedBody = sanitizeComment(body)

  const comment = await prisma.comment.create({
    data: {
      body: sanitizedBody,
      reportId,
      slideId: slideId || null,
      authorId: session.user.id
    },
    include: {
      author: {
        select: { id: true, name: true, image: true, email: true }
      }
    }
  })

  return NextResponse.json(comment)
}