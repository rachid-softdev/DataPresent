import Stripe from 'stripe'
import { env, isFeatureEnabled } from '@/env'

const stripeApiVersion = '2026-04-22.dahlia' as const

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!isFeatureEnabled('stripe')) {
      throw new Error('Stripe is not configured')
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: stripeApiVersion,
    })
  }
  return _stripe
}
