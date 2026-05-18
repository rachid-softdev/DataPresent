import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { logApiError } from '@/lib/security'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Rate limiting: 5 requests per hour per email
    const rateLimitAllowed = await checkRateLimit(`forgot-password:${email}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, we don't reveal it

    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a reset email has been sent.' })
    }

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email }
    })

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expires,
      }
    })

    // TODO: Send email with reset link
    // For now, we'll log it (in production, send actual email)
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    console.log(`[Password Reset] Email: ${email}, Reset URL: ${resetUrl}`)

    // In production, you would send an email here using Resend or similar:
    // await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json({ success: true, message: 'If an account exists, a reset email has been sent.' })
  } catch (error) {
    await logApiError(error as Error, { path: '/api/auth/forgot-password', method: 'POST' })
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}