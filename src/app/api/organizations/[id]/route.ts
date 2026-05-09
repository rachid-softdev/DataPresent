import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, unauthorized, forbidden, notFound, badRequest } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params

  const membership = await prisma.membership.findFirst({
    where: { orgId: id, userId: session.user.id }
  })

  if (!membership) {
    return forbidden()
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: true,
      _count: { select: { reports: true, members: true } }
    }
  })

  if (!org) {
    return notFound()
  }

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.subscription?.plan || 'FREE',
      status: org.subscription?.status || null,
      reportCount: org._count.reports,
      memberCount: org._count.members,
      currentPeriodEnd: org.subscription?.currentPeriodEnd
    }
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

  const membership = await prisma.membership.findFirst({
    where: { orgId: id, userId: session.user.id }
  })

  if (!membership || membership.role === 'MEMBER') {
    return forbidden()
  }

  const { name } = await req.json()

  const org = await prisma.organization.update({
    where: { id },
    data: { name }
  })

  return NextResponse.json({ 
    organization: { id: org.id, name: org.name }
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params

  const membership = await prisma.membership.findFirst({
    where: { orgId: id, userId: session.user.id }
  })

  if (!membership || membership.role !== 'OWNER') {
    return badRequest(ERROR_CODES.ERR_RESOURCE_OWNER_DELETE)
  }

  await prisma.organization.delete({ where: { id } })

  return NextResponse.json({ success: true })
}