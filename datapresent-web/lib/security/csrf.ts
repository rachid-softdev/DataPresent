import { cookies } from 'next/headers'
import crypto from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-secret-change-me'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Generate a CSRF token for the current user session
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString()
  const randomBytes = crypto.randomBytes(16).toString('hex')

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(CSRF_SECRET.slice(0, 32), 'utf8'), iv)

  const data = `${timestamp}:${randomBytes}`
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

/**
 * Validate a CSRF token
 */
export async function validateCsrfToken(token: string): Promise<boolean> {
  if (!token) return false

  try {
    const parts = token.split(':')
    if (parts.length !== 3) return false

    const [ivHex, tagHex, encrypted] = parts
    if (!ivHex || !tagHex || !encrypted) return false

    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      return false
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(CSRF_SECRET.slice(0, 32), 'utf8'),
      iv
    )
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    // Token is valid for 1 hour
    const [timestamp] = decrypted.split(':')
    const tokenAge = Date.now() - parseInt(timestamp)

    return tokenAge < 3600000 // 1 hour in milliseconds
  } catch {
    return false
  }
}

/**
 * Get CSRF token from cookies (for server-side validation)
 */
export async function getCsrfTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('csrf-token')?.value || null
}

/**
 * Create a signed job token for BullMQ workers
 */
export function signJobData(data: Record<string, unknown>): { data: Record<string, unknown>; signature: string } {
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(JSON.stringify(data))
    .digest('hex')

  return { data, signature }
}

/**
 * Verify a signed job token from BullMQ workers
 */
export function verifyJobSignature(data: Record<string, unknown>, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(JSON.stringify(data))
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}