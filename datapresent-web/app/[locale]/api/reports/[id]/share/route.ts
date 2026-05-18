import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, unauthorized, forbidden, notFound, badRequest } from '@/lib/errors'
import { hashPassword, isPasswordValid } from '@/lib/password'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    select: { 
      shareToken: true, 
      isPublic: true, 
      title: true,
      allowComments: true,
      allowEmbed: true,
      shareExpiresAt: true,
      sharePassword: true,
      org: { select: { members: { select: { userId: true } } } }
    }
  })

  if (!report) {
    return notFound()
  }

  // Check ownership: user must be a member of the org
  const isMember = report.org.members.some(m => m.userId === session.user.id)
  if (!isMember) {
    return forbidden()
  }

  const commentCount = await prisma.comment.count({
    where: { reportId: id, slideId: null }
  })

  return NextResponse.json({
    shareToken: report.shareToken,
    isPublic: report.isPublic,
    shareUrl: report.shareToken ? `${process.env.NEXTAUTH_URL}/share/${report.shareToken}` : null,
    embedUrl: report.shareToken && report.isPublic && report.allowEmbed 
      ? `${process.env.NEXTAUTH_URL}/embed/${report.shareToken}` 
      : null,
    allowComments: report.allowComments,
    allowEmbed: report.allowEmbed,
    expiresAt: report.shareExpiresAt,
    password: !!report.sharePassword,
    commentCount
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: { org: { include: { members: true } } }
  })

  if (!report) {
    return notFound()
  }

  const isMember = report.org.members.some(m => m.userId === session.user.id)
  if (!isMember) {
    return forbidden()
  }

  const { isPublic } = await req.json()

  let shareToken = report.shareToken
  if (isPublic && !shareToken) {
    shareToken = crypto.randomUUID()
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { 
      isPublic,
      shareToken: isPublic ? shareToken : null,
    },
    select: { 
      shareToken: true, 
      isPublic: true,
      allowComments: true,
      shareExpiresAt: true
    }
  })

  return NextResponse.json({
    shareToken: updated.shareToken,
    isPublic: updated.isPublic,
    allowComments: updated.allowComments,
    expiresAt: updated.shareExpiresAt,
    shareUrl: updated.shareToken ? `${process.env.NEXTAUTH_URL}/share/${updated.shareToken}` : null
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: { org: { include: { members: true } } }
  })

  if (!report) {
    return notFound()
  }

  const isMember = report.org.members.some(m => m.userId === session.user.id)
  if (!isMember) {
    return forbidden()
  }

  const { allowComments, allowEmbed, expiresAt, password } = await req.json()

  // Validate password if provided
  if (password && !isPasswordValid(password)) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_INVALID_PASSWORD)
  }

  // Hash the password if provided
  const hashedPassword = password ? await hashPassword(password) : null

  let shareExpiresAt: Date | null = null
  if (expiresAt === '7d') {
    shareExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  } else if (expiresAt === '30d') {
    shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  } else if (expiresAt === '90d') {
    shareExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  }

  // If password is being removed, set to null; otherwise use hashed password
  const passwordUpdate = password === '' ? null : hashedPassword

  const updated = await prisma.report.update({
    where: { id },
    data: {
      allowComments: allowComments ?? true,
      allowEmbed: allowEmbed ?? false,
      shareExpiresAt,
      sharePassword: passwordUpdate,
    },
    select: {
      allowComments: true,
      allowEmbed: true,
      shareExpiresAt: true,
      sharePassword: true
    }
  })

  return NextResponse.json({
    allowComments: updated.allowComments,
    allowEmbed: updated.allowEmbed,
    expiresAt: updated.shareExpiresAt,
    password: !!updated.sharePassword
  })
}