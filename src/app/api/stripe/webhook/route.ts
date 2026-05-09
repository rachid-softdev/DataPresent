import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { ERROR_CODES, badRequest } from '@/lib/errors'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_INVALID_SIGNATURE)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const priceId = session.metadata?.priceId

      const org = await prisma.organization.findFirst({
        where: { subscription: { stripeCustomerId: customerId } },
      })

      if (org) {
        const plan = priceId === process.env.STRIPE_TEAM_PRICE_ID ? 'TEAM' : 'PRO'
        await prisma.subscription.update({
          where: { orgId: org.id },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status: 'ACTIVE',
          },
        })
      } else {
        // Orphan checkout session: subscription created but no org linked yet
        // This can happen with delayed org creation — log for manual remediation
        console.error(`Stripe webhook: no org found for customer ${customerId} (checkout ${session.id})`)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          status: subscription.status === 'active' ? 'ACTIVE' : 
                 subscription.status === 'past_due' ? 'PAST_DUE' : 'CANCELED',
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          status: 'CANCELED',
          plan: 'FREE',
          stripeSubscriptionId: null,
          stripePriceId: null,
        },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
