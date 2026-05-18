import Stripe from 'stripe'

const stripeApiVersion = '2026-04-22.dahlia' as const

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: stripeApiVersion,
    })
  : null

export function getStripe() {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  return stripe
}