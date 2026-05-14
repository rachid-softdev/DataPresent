import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken } from './csrf'

/**
 * CSRF protection middleware for API routes
 * Use this for POST, PUT, PATCH, DELETE requests
 */
export async function withCsrfProtection(req: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF for GET, OPTIONS, and health checks
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return null
  }

  // Skip for webhook endpoints that use their own signature validation
  const pathname = req.nextUrl.pathname
  if (pathname.includes('/api/stripe/webhook') || pathname.includes('/api/webhook')) {
    return null
  }

  // Check CSRF token from header
  const csrfToken = req.headers.get('x-csrf-token')
  if (!csrfToken) {
    return NextResponse.json(
      { error: 'CSRF token required. Include X-CSRF-Token header.' },
      { status: 403 }
    )
  }

  const isValid = await validateCsrfToken(csrfToken)
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid or expired CSRF token' },
      { status: 403 }
    )
  }

  return null
}

/**
 * Validate job signature for BullMQ workers
 */
export function validateJobSignature<T extends Record<string, unknown>>(
  jobData: T & { signature?: string }
): { valid: boolean; cleanData: T } {
  const { signature, ...rest } = jobData

  if (!signature) {
    return { valid: false, cleanData: rest as T }
  }

  const valid = verifyJobSignature(rest as T, signature)
  return { valid, cleanData: rest as T }
}

function verifyJobSignature(data: Record<string, unknown>, signature: string): boolean {
  const crypto = require('crypto')
  const secret = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-secret-change-me'
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}