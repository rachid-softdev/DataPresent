import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logApiError, withCsrfProtection } from '@/lib/security'
import { verifyToken, extractTokenPrefix } from '@/lib/crypto'
import { hashPassword } from '@/lib/password'
import { PasswordResetSchema } from '@/lib/validation-schemas'

export async function POST(req: NextRequest) {
  const csrfResponse = await withCsrfProtection(req)
  if (csrfResponse) return csrfResponse

  try {
    const body = await req.json()
    const parsed = PasswordResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { token, password } = parsed.data

    // Find the reset token by prefix for O(1) indexed lookup
    const tokenPrefix = extractTokenPrefix(token)
    const candidates = await prisma.passwordResetToken.findMany({
      where: { tokenPrefix, used: false, expires: { gt: new Date() } },
    })

    let resetToken = null
    for (const candidate of candidates) {
      if (await verifyToken(token, candidate.token)) {
        resetToken = candidate
        break
      }
    }

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    }

    // Find the user associated with the reset token
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Hash the new password and store it (upsert handles both first-time and reset)
    const hashedPassword = await hashPassword(password)

    // Use a transaction to ensure atomicity
    await prisma.$transaction([
      prisma.password.upsert({
        where: { userId: user.id },
        create: { userId: user.id, hash: hashedPassword },
        update: { hash: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ])

    return NextResponse.json({ success: true, message: 'Password has been reset successfully' })
  } catch (error) {
    await logApiError(error as Error, { path: '/api/auth/reset-password', method: 'POST' })
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}