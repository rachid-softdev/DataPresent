import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMagicLinkEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { randomBytes } from 'crypto'
import { ERROR_CODES, SUCCESS_CODES, badRequest, apiSuccess } from '@/lib/errors'

const TOKEN_EXPIRY = 10 * 60 * 1000 // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    if (!email || typeof email !== 'string') {
      return badRequest(ERROR_CODES.ERR_VALIDATION_EMAIL_REQUIRED)
    }
    
    const normalizedEmail = email.toLowerCase().trim()
    
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return badRequest(ERROR_CODES.ERR_VALIDATION_EMAIL_INVALID)
    }
    
    const hasRateLimit = await checkRateLimit(`signup:${normalizedEmail}`)
    
    if (!hasRateLimit) {
      return NextResponse.json(
        { error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT },
        { status: 429 }
      )
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })
    
    if (existingUser) {
      return badRequest(ERROR_CODES.ERR_VALIDATION_EMAIL_INVALID)
    }
    
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + TOKEN_EXPIRY)
    
    await prisma.magicLinkToken.create({
      data: {
        email: normalizedEmail,
        token,
        expires,
        used: false
      }
    })
    
    const magicLink = `${process.env.NEXTAUTH_URL}/api/auth/callback/email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`
    
    try {
      await sendMagicLinkEmail(normalizedEmail, magicLink)
    } catch (emailError) {
      console.error('Failed to send email:', emailError instanceof Error ? emailError.message : String(emailError))
      return NextResponse.json(
        { error: ERROR_CODES.ERR_AUTH_FAILED },
        { status: 500 }
      )
    }
    
    return apiSuccess(SUCCESS_CODES.MSG_AUTH_SIGNUP_SUCCESS)
    
  } catch (error) {
    console.error('Signup error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: ERROR_CODES.ERR_RESOURCE_NOT_FOUND },
      { status: 500 }
    )
  }
}