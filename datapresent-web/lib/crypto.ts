import crypto from 'crypto'
import { env } from '@/env'
import { hashPassword, verifyPassword } from './password'

const SECRET = env.JOB_SIGNING_SECRET

export function signJobData(data: Record<string, unknown>): { data: Record<string, unknown>; signature: string } {
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(data, Object.keys(data).sort()))
    .digest('hex')
  return { data, signature }
}

export function verifyJobSignature(data: Record<string, unknown>, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(data, Object.keys(data).sort()))
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

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Hash a token for secure storage (uses Argon2id, same as API keys)
 */
export async function hashToken(token: string): Promise<string> {
  return hashPassword(token)
}

/**
 * Verify a token against its stored hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return verifyPassword(token, hash)
}

/**
 * Extract token prefix for indexed DB lookup
 * First 12 characters of the raw hex token
 */
export function extractTokenPrefix(token: string): string {
  return token.slice(0, 12)
}