import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { logApiError, logSecurityEvent } from '@/lib/security'
import crypto from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orgId } = await params
    const { email, role } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user is ADMIN or OWNER of the organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        role: { in: ['ADMIN', 'OWNER'] }
      }
    })

    if (!membership) {
      logSecurityEvent({
        type: 'unauthorized_access',
        userId: session.user.id,
        path: `/api/organizations/${orgId}/invite`,
        details: 'Attempted to invite without permission'
      })
      return NextResponse.json({ error: 'Only admins and owners can invite members' }, { status: 403 })
    }

    // Rate limiting: 10 invites per hour per organization
    const rateLimitAllowed = await checkRateLimit(`invite-org:${orgId}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: 'Too many invites. Please try again later.' }, { status: 429 })
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      const existingMembership = await prisma.membership.findFirst({
        where: { userId: existingUser.id, orgId }
      })
      if (existingMembership) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
      }
    }

    // Delete any existing invite for this email/org
    await prisma.inviteToken.deleteMany({
      where: { email, orgId }
    })

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.inviteToken.create({
      data: {
        email,
        orgId,
        role: role || 'MEMBER',
        token: inviteToken,
        expires,
        createdById: session.user.id,
      }
    })

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`
    console.log(`[Team Invite] Email: ${email}, Invite URL: ${inviteUrl}`)

    // TODO: Send invitation email
    // await sendTeamInviteEmail(email, inviteUrl, orgName)

    return NextResponse.json({ success: true, message: 'Invitation sent successfully' })
  } catch (error) {
    await logApiError(error as Error, { path: `/api/organizations/${await params.then(p => p.id)}/invite`, method: 'POST' })
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}