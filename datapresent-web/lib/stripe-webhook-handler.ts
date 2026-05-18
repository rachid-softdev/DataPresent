// ==========================================
// Stripe Webhook Handler - Enriched with Idempotency & Cache
// ==========================================

import Stripe from 'stripe'
import { getStripe } from './stripe'
import { prisma } from './prisma'
import { captureException, captureMessage } from './sentry'
import { entitlementRepository } from './entitlements/repository'
import { invalidateCache } from './entitlements/feature-gate'
import type { Plan } from '@prisma/client'

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s - exponential backoff

type EventHandler = (data: Stripe.Event['data']['object']) => Promise<void>
type EventHandlerWithOrg = (data: Stripe.Event['data']['object'], orgId: string) => Promise<void>

// ==========================================
// Helper Functions
// ==========================================

/**
 * Resolve orgId from Stripe customer ID
 */
async function getOrgIdByCustomer(customerId: string): Promise<string | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    select: { orgId: true },
  })
  return subscription?.orgId ?? null
}

/**
 * Map Stripe price ID to plan key
 */
function getPlanFromPriceId(priceId: string | null): Plan {
  if (!priceId) return 'FREE'

  const priceIdToPlan: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'PRO',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY!]: 'TEAM',
    [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'FREE',
  }

  return priceIdToPlan[priceId] ?? 'PRO'
}

/**
 * Invalidate entitlements cache after subscription changes
 */
async function invalidateSubscriptionCache(orgId: string): Promise<void> {
  try {
    await invalidateCache(orgId)
    captureMessage(`Entitlements cache invalidated for org ${orgId}`, 'debug')
  } catch (error) {
    captureException(new Error(`Failed to invalidate cache for org ${orgId}`), {
      orgId,
    })
  }
}

// ==========================================
// Event Handlers
// ==========================================

const eventHandlers: Record<string, EventHandler> = {
  'checkout.session.completed': async (data) => {
    const session = data as Stripe.Checkout.Session
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    const priceId = session.metadata?.priceId

    const orgId = await getOrgIdByCustomer(customerId)

    if (orgId) {
      const plan = getPlanFromPriceId(priceId)
      await entitlementRepository.updateSubscription(orgId, {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        plan,
        status: 'ACTIVE',
      })

      await invalidateSubscriptionCache(orgId)
      captureMessage(`Subscription activated for org ${orgId}`, 'info', { plan })
    } else {
      captureMessage(`Orphan checkout session: ${session.id}`, 'warning', { customerId })
    }
  },

  'customer.subscription.created': async (data) => {
    const subscription = data as Stripe.Subscription
    const customerId = subscription.customer as string
    const priceId = (subscription.items.data[0] as any)?.price?.id
    const plan = getPlanFromPriceId(priceId)
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

    const orgId = await getOrgIdByCustomer(customerId)

    if (orgId) {
      await entitlementRepository.updateSubscription(orgId, {
        plan,
        status: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        currentPeriodEnd,
      })

      await invalidateSubscriptionCache(orgId)
      captureMessage(`Subscription created for org ${orgId}`, 'info', { plan })
    }
  },

  'customer.subscription.updated': async (data) => {
    const subscription = data as Stripe.Subscription
    const customerId = subscription.customer as string
    const priceId = (subscription.items.data[0] as any)?.price?.id
    const plan = getPlanFromPriceId(priceId)

    const orgId = await getOrgIdByCustomer(customerId)

    if (!orgId) {
      captureMessage(`Subscription update for unknown customer: ${customerId}`, 'warning')
      return
    }

    // Map Stripe status to our status
    const statusMap: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      trialing: 'TRIALING',
      incomplete: 'PAST_DUE',
      incomplete_expired: 'CANCELED',
      unpaid: 'PAST_DUE',
    }

    const status = statusMap[subscription.status] ?? 'ACTIVE'
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

    // Check for plan downgrade
    const currentSub = await prisma.subscription.findUnique({
      where: { orgId },
      select: { plan: true },
    })

    const isDowngrade =
      currentSub && currentSub.plan !== 'FREE' && plan !== 'FREE' && plan !== currentSub.plan

    if (isDowngrade) {
      captureMessage(
        `Plan downgrade detected for org ${orgId}: ${currentSub.plan} -> ${plan}`,
        'info'
      )
    }

    await entitlementRepository.updateSubscription(orgId, {
      plan,
      status,
      stripePriceId: priceId,
      currentPeriodEnd,
    })

    await invalidateSubscriptionCache(orgId)

    captureMessage(`Subscription updated for org ${orgId}`, 'info', {
      status: subscription.status,
      plan,
      isDowngrade,
    })
  },

  'customer.subscription.deleted': async (data) => {
    const subscription = data as Stripe.Subscription
    const customerId = subscription.customer as string

    const orgId = await getOrgIdByCustomer(customerId)

    if (orgId) {
      await entitlementRepository.updateSubscription(orgId, {
        status: 'CANCELED',
        plan: 'FREE',
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodEnd: null,
      })

      await invalidateSubscriptionCache(orgId)
      captureMessage(`Subscription cancelled for org ${orgId}`, 'info')
    }
  },

  'invoice.payment_succeeded': async (data) => {
    const invoice = data as Stripe.Invoice
    const customerId = invoice.customer as string
    const orgId = await getOrgIdByCustomer(customerId)

    if (!orgId) {
      captureMessage(`Invoice payment for unknown customer: ${customerId}`, 'warning')
      return
    }

    // Update subscription to ACTIVE if it was past_due
    // Also update period dates
    const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : undefined

    await entitlementRepository.updateSubscription(orgId, {
      status: 'ACTIVE',
      ...(periodEnd && { currentPeriodEnd: periodEnd }),
    })

    await invalidateSubscriptionCache(orgId)

    captureMessage(`Invoice paid for org ${orgId}`, 'info', {
      amount: invoice.amount_paid,
    })
  },

  'invoice.payment_failed': async (data) => {
    const invoice = data as Stripe.Invoice
    const customerId = invoice.customer as string

    const orgId = await getOrgIdByCustomer(customerId)

    if (orgId) {
      // Mark subscription as past_due
      await entitlementRepository.updateSubscription(orgId, {
        status: 'PAST_DUE',
      })

      await invalidateSubscriptionCache(orgId)

      captureMessage(`Invoice payment failed for org ${orgId}`, 'warning', {
        amount: invoice.amount_due,
      })
    }
  },

  'customer.subscription.trial_will_end': async (data) => {
    const subscription = data as Stripe.Subscription
    const customerId = subscription.customer as string
    const orgId = await getOrgIdByCustomer(customerId)

    if (orgId) {
      // Trial ending soon - could trigger email notification here
      captureMessage(`Trial ending soon for org ${orgId}`, 'info', {
        trialEnd: subscription.trial_end,
      })
    }
  },
}

// ==========================================
// Idempotency Check
// ==========================================

/**
 * Check if event has already been processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  return entitlementRepository.isEventProcessed(eventId)
}

/**
 * Mark event as processed
 */
export async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  return entitlementRepository.markEventProcessed(eventId, eventType)
}

// ==========================================
// Process with Retry
// ==========================================

/**
 * Process a Stripe webhook event with retry logic
 */
export async function processWebhookEvent(event: Stripe.Event, retryCount = 0): Promise<void> {
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

      captureMessage(`Webhook ${event.type} failed, retrying in ${delay}ms`, 'warning', {
        retryCount,
        maxRetries: MAX_RETRIES,
        error: errorMessage,
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
      return processWebhookEvent(event, retryCount + 1)
    }

    // All retries exhausted
    captureException(
      new Error(`Webhook ${event.type} failed after ${MAX_RETRIES} retries: ${errorMessage}`),
      {
        eventType: event.type,
        eventId: event.id,
      }
    )

    throw error // Re-throw so the route returns 500 for Stripe to retry
  }
}

// ==========================================
// Signature Verification
// ==========================================

/**
 * Verify webhook signature and construct the event
 */
export function constructWebhookEvent(payload: string, signature: string): Stripe.Event {
  const stripe = getStripe()

  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
}

/**
 * Verify webhook signature - returns null if invalid
 */
export function verifyWebhookSignature(payload: string, signature: string): Stripe.Event | null {
  try {
    return constructWebhookEvent(payload, signature)
  } catch (error) {
    captureException(new Error('Invalid webhook signature'), {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ==========================================
// Main Handler
// ==========================================

/**
 * Handle webhook event with full lifecycle management:
 * 1. Idempotency check
 * 2. Process event
 * 3. Mark as processed
 * 4. Invalidate cache
 */
export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<{ success: boolean; error?: string; alreadyProcessed?: boolean }> {
  const eventId = event.id
  const eventType = event.type

  // Log receipt
  captureMessage(`Webhook received: ${eventType}`, 'debug', { eventId })

  // Idempotency check
  const alreadyProcessed = await isEventProcessed(eventId)
  if (alreadyProcessed) {
    captureMessage(`Webhook already processed: ${eventId}`, 'debug', { eventId })
    return { success: true, alreadyProcessed: true }
  }

  try {
    await processWebhookEvent(event)

    // Mark event as processed AFTER successful handling
    await markEventProcessed(eventId, eventType)

    captureMessage(`Webhook processed successfully: ${eventType}`, 'debug', { eventId })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    captureMessage(`Webhook processing failed: ${eventType}`, 'error', {
      eventId,
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}

// ==========================================
// Utility: Parse Webhook Body
// ==========================================

/**
 * Parse webhook request body
 */
export function parseWebhookBody(payload: string | Buffer): string {
  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf-8')
  }
  return payload
}
