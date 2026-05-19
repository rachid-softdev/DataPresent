import crypto from 'crypto'

// Job security secret must be set in environment - fail fast if missing
const SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET
if (!SECRET) {
  throw new Error('CRITICAL: CSRF_SECRET or NEXTAUTH_SECRET environment variable is required for job signing.')
}

/**
 * Sign job data for BullMQ workers
 */
export function signJobData(data: Record<string, unknown>): { data: Record<string, unknown>; signature: string } {
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(data))
    .digest('hex')

  return { data: { ...data, signature }, signature }
}

/**
 * Verify job signature from BullMQ workers
 */
export function verifyJobSignature(data: Record<string, unknown>, signature: string): boolean {
  const { signature: _, ...cleanData } = data as any

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(cleanData))
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Extract and validate signed job data
 */
export function extractSignedJobData<T extends Record<string, unknown>>(
  jobData: T & { signature?: string }
): { valid: boolean; cleanData: T } {
  const { signature, ...cleanData } = jobData

  if (!signature) {
    return { valid: false, cleanData: cleanData as T }
  }

  const valid = verifyJobSignature(cleanData as Record<string, unknown>, signature)
  return { valid, cleanData: cleanData as T }
}