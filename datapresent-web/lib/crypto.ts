import crypto from 'crypto'
import { env } from '@/env'

const SECRET = env.CSRF_SECRET

export function signJobData(data: Record<string, unknown>): { data: Record<string, unknown>; signature: string } {
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(data))
    .digest('hex')
  return { data, signature }
}

export function verifyJobSignature(data: Record<string, unknown>, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(data))
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function extractSignedJobData<T extends Record<string, unknown>>(
  jobData: T & { signature?: string }
): { valid: boolean; cleanData: T } {
  const { signature, ...cleanData } = jobData as any
  if (!signature) return { valid: false, cleanData: cleanData as T }
  const valid = verifyJobSignature(cleanData as Record<string, unknown>, signature)
  return { valid, cleanData: cleanData as T }
}