import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withCsrfProtection } from '@/lib/security'
import { unauthorized } from '@/lib/errors'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      membership: {
        select: {
          orgId: true,
          role: true,
          org: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest) {
  const csrfResponse = await withCsrfProtection(req)
  if (csrfResponse) return csrfResponse

  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { confirm } = await req.json()
  if (!confirm) {
    return NextResponse.json({ error: 'Confirmation required. Set confirm: true to delete your account.' }, { status: 400 })
  }

  await prisma.user.delete({
    where: { id: session.user.id },
  })

  return NextResponse.json({ success: true })
}
