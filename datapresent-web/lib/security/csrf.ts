import crypto from 'crypto'
import { env } from '@/env'

const CSRF_SECRET = env.CSRF_SECRET

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

export function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Generate a CSRF token for the current user session
 */
export function generateCsrfToken(userId?: string): string {
  const timestamp = Date.now().toString()
  const randomBytes = crypto.randomBytes(16).toString('hex')

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(CSRF_SECRET), iv)

  const data = userId ? `${userId}:${timestamp}:${randomBytes}` : `${timestamp}:${randomBytes}`
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

/**
 * Validate a CSRF token
 */
export async function validateCsrfToken(token: string, userId?: string): Promise<boolean> {
  if (!token) return false

  try {
    const parts = token.split(':')
    if (parts.length < 3) return false

    const [ivHex, tagHex, encrypted] = parts
    if (!ivHex || !tagHex || !encrypted) return false

    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      return false
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      deriveKey(CSRF_SECRET),
      iv
    )
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    const tokenParts = decrypted.split(':')
    let tokenUserId: string | undefined
    let timestamp: string
    if (tokenParts.length === 3) {
      tokenUserId = tokenParts[0]
      timestamp = tokenParts[1]
    } else {
      timestamp = tokenParts[0]
    }

    // If userId is provided, verify token belongs to that user
    if (userId && tokenUserId && tokenUserId !== userId) return false

    const tokenAge = Date.now() - parseInt(timestamp, 10)

    return tokenAge < 3600000 // 1 hour in milliseconds
  } catch {
    return false
  }
}



