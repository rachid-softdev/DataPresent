import Stripe from 'stripe'
import { getStripe } from './stripe'
import { prisma } from './prisma'
import { captureException, captureMessage } from './sentry'

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s - exponential backoff

type EventHandler = (data: Stripe.Event['data']['object']) => Promise<void>

const eventHandlers: Record<string, EventHandler> = {
  'checkout.session.completed': async (data) => {
    const session = data as Stripe.Checkout.Session
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
      captureMessage(`Subscription activated for org ${org.id}`, 'info', { plan })
    } else {
      captureMessage(`Orphan checkout session: ${session.id}`, 'warning', { customerId })
    }
  },

  'customer.subscription.updated': async (data) => {
    const subscription = data as Stripe.Subscription
    const customerId = subscription.customer as string

    await prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' :
               subscription.status === 'past_due' ? 'PAST_DUE' : 'CANCELED',
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      },
    })

    captureMessage(`Subscription updated for customer ${customerId}`, 'info', {
      status: subscription.status,
    })
  },

  'customer.subscription.deleted': async (data) => {
    const subscription = data as Stripe.Subscription
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

    captureMessage(`Subscription cancelled for customer ${customerId}`, 'info')
  },

  'invoice.payment_succeeded': async (data) => {
    const invoice = data as Stripe.Invoice
    const customerId = invoice.customer as string

    // Update subscription to ACTIVE if it was past_due
    await prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId, status: 'PAST_DUE' },
      data: { status: 'ACTIVE' },
    })

    captureMessage(`Invoice paid for customer ${customerId}`, 'info', {
      amount: invoice.amount_paid,
    })
  },

  'invoice.payment_failed': async (data) => {
    const invoice = data as Stripe.Invoice
    const customerId = invoice.customer as string

    // Mark subscription as past_due
    await prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data: { status: 'PAST_DUE' },
    })

    captureMessage(`Invoice payment failed for customer ${customerId}`, 'warning', {
      amount: invoice.amount_due,
    })
  },
}

/**
 * Process a Stripe webhook event with retry logic
 */
export async function processWebhookEvent(
  event: Stripe.Event,
  retryCount = 0
): Promise<void> {
  const handler = eventHandlers[event.type]

  if (!handler) {
    captureMessage(`Unhandled webhook event type: ${event.type}`, 'debug')
    return
  }

  try {
    await handler(event.data.object)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
      
      captureMessage(
        `Webhook ${event.type} failed, retrying in ${delay}ms`,
        'warning',
        { retryCount, maxRetries: MAX_RETRIES, error: errorMessage }
      )

      await new Promise(resolve => setTimeout(resolve, delay))
      return processWebhookEvent(event, retryCount + 1)
    }

    // All retries exhausted
    captureException(new Error(`Webhook ${event.type} failed after ${MAX_RETRIES} retries: ${errorMessage}`), {
      eventType: event.type,
      eventId: event.id,
    })

    throw error // Re-throw so the route returns 500 for Stripe to retry
  }
}

/**
 * Verify webhook signature and construct the event
 */
export function constructWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

/**
 * Handle webhook event with full lifecycle management
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; error?: string }> {
  const eventId = event.id
  const eventType = event.type

  // Log receipt
  captureMessage(`Webhook received: ${eventType}`, 'debug', { eventId })

  try {
    await processWebhookEvent(event)
    captureMessage(`Webhook processed successfully: ${eventType}`, 'debug', { eventId })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    captureMessage(`Webhook processing failed: ${eventType}`, 'error', { eventId, error: errorMessage })
    return { success: false, error: errorMessage }
  }
}