import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { PLANS } from '@/lib/plans'
import { ERROR_CODES, unauthorized, badRequest } from '@/lib/errors'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { plan } = await req.json()
  const planConfig = PLANS[plan as keyof typeof PLANS]

  if (!planConfig?.stripePriceId) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_INVALID_PLAN)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { subscription: true } } } } },
  })

  const org = user?.membership[0]?.org
  if (!org) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_NO_ORGANIZATION)
  }

  let customerId = org.subscription?.stripeCustomerId

  if (!customerId) {
    const customer = await getStripe().customers.create({
      metadata: { orgId: org.id },
    })
    customerId = customer.id

    await prisma.subscription.upsert({
      where: { orgId: org.id },
      update: { stripeCustomerId: customerId },
      create: { orgId: org.id, stripeCustomerId: customerId },
    })
  }

  const sessionUrl = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/settings/billing?canceled=true`,
    metadata: { orgId: org.id, priceId: planConfig.stripePriceId },
  })

  return NextResponse.json({ url: sessionUrl.url })
}
