import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, unauthorized, badRequest } from '@/lib/errors'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: {
            include: {
              subscription: true,
              _count: { select: { reports: true, members: true } }
            }
          }
        }
      }
    }
  })

  const organizations = user?.membership.map(m => ({
    id: m.org.id,
    name: m.org.name,
    slug: m.org.slug,
    role: m.role,
    reportCount: m.org._count.reports,
    memberCount: m.org._count.members,
    plan: m.org.subscription?.plan || 'FREE'
  })) || []

  return NextResponse.json({ organizations })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { name, slug } = await req.json()

  if (!name || !slug) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_SLUG_REQUIRED)
  }

  const existingSlug = await prisma.organization.findUnique({
    where: { slug }
  })

  if (existingSlug) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_SLUG_TAKEN)
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER'
        }
      }
    },
    include: {
      members: true
    }
  })

  return NextResponse.json({ 
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: 'OWNER'
    }
  })
}