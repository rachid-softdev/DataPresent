import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { logApiError } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Rate limiting: 5 attempts per hour
    const rateLimitAllowed = await checkRateLimit(`invite:${session.user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    // Find the invite token
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token }
    })

    if (!inviteToken) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    if (inviteToken.used) {
      return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 })
    }

    if (inviteToken.expires < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if the user's email matches the invite
    if (session.user.email !== inviteToken.email) {
      return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 })
    }

    // Create membership
    await prisma.membership.create({
      data: {
        userId: session.user.id,
        orgId: inviteToken.orgId,
        role: inviteToken.role,
      }
    })

    // Mark token as used
    await prisma.inviteToken.update({
      where: { id: inviteToken.id },
      data: { used: true }
    })

    return NextResponse.json({ success: true, message: 'You have joined the organization successfully' })
  } catch (error) {
    await logApiError(error as Error, { path: '/api/auth/accept-invite', method: 'POST' })
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}