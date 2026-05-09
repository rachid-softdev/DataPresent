import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES, unauthorized, badRequest } from '@/lib/errors'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { subscription: true } } } } },
  })

  const org = user?.membership[0]?.org
  if (!org?.subscription?.stripeCustomerId) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_NO_SUBSCRIPTION)
  }

  const portalUrl = await getStripe().billingPortal.sessions.create({
    customer: org.subscription.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/settings/billing`,
  })

  return NextResponse.json({ url: portalUrl.url })
}
