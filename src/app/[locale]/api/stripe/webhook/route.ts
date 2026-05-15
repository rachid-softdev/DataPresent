import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, handleWebhookEvent } from '@/lib/stripe-webhook-handler'
import { ERROR_CODES, badRequest } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_INVALID_SIGNATURE)
  }

  let event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return badRequest(ERROR_CODES.ERR_RESOURCE_INVALID_SIGNATURE)
  }

  const result = await handleWebhookEvent(event)

  if (!result.success) {
    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: 'Webhook processing failed', details: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
