import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signIn } from '@/lib/auth'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(new URL('/login?error=errors.auth.invalidToken', req.url))
  }

  try {
    const magicLinkToken = await prisma.magicLinkToken.findUnique({
      where: { token }
    })

    if (!magicLinkToken) {
      return NextResponse.redirect(new URL('/login?error=errors.auth.invalidToken', req.url))
    }

    if (magicLinkToken.used) {
      return NextResponse.redirect(new URL('/login?error=errors.auth.tokenUsed', req.url))
    }

    if (magicLinkToken.expires < new Date()) {
      return NextResponse.redirect(new URL('/login?error=errors.auth.tokenExpired', req.url))
    }

    await prisma.magicLinkToken.update({
      where: { id: magicLinkToken.id },
      data: { used: true }
    })

    const existingUser = await prisma.user.findUnique({
      where: { email: magicLinkToken.email }
    })

    const isNewUser = !existingUser

    const user = existingUser || await prisma.user.create({
      data: {
        email: magicLinkToken.email,
        name: magicLinkToken.email.split('@')[0],
      }
    })

    if (isNewUser) {
      // Generate a unique slug: use timestamp + random to avoid collision
      const slug = `org-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`
      await prisma.organization.create({
        data: {
          name: 'Mon Entreprise',
          slug,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          },
          subscription: {
            create: {
              stripeCustomerId: `cus_free_${Date.now()}`,
              plan: 'FREE',
              status: 'ACTIVE'
            }
          }
        }
      })
    }

    // Create a session via the credentials provider which handles cookie setting
    const signInResult = await signIn('credentials', {
      token,
      email: magicLinkToken.email,
      redirect: false,
    })

    if (signInResult) {
      // signIn returns the URL to redirect to on success, or an error URL
      const redirectUrl = new URL('/', req.url)
      const response = NextResponse.redirect(redirectUrl)

      // Copy any set-cookie headers from the signIn result
      if (typeof signInResult === 'string') {
        return NextResponse.redirect(new URL(signInResult, req.url))
      }
    }

    // Fallback: redirect to home and let the client-side session check handle auth
    return NextResponse.redirect(new URL('/', req.url))
  } catch (error) {
    console.error('Email callback error:', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL('/login?error=errors.auth.failed', req.url))
  }
}