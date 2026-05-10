import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unauthorized } from '@/lib/errors'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true }
  })

  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { name } = await req.json()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name }
  })

  return NextResponse.json({ 
    user: { id: user.id, name: user.name, email: user.email }
  })
}