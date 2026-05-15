import { prisma } from '@/lib/prisma'
import { captureException, captureMessage } from '@/lib/sentry'
import { hash, verify } from './password'

/**
 * Generate a new API key for an organization
 */
export async function createApiKey(params: {
  orgId: string
  name: string
  expiresInDays?: number
}): Promise<{ key: string; apiKey: { id: string; name: string; expiresAt: Date | null } }> {
  const { orgId, name, expiresInDays = 365 } = params

  // Generate a secure random key (64 characters)
  const key = generateSecureKey()
  
  // Hash the key for storage
  const keyHash = await hash(key)

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash,
      orgId,
      name,
      expiresAt,
    },
  })

  captureMessage(`API key created for org ${orgId}`, 'info', { keyName: name })

  // Return the raw key only once
  return { key, apiKey: { id: apiKey.id, name: apiKey.name, expiresAt: apiKey.expiresAt } }
}

/**
 * Validate an API key
 */
export async function validateApiKey(key: string): Promise<{ valid: boolean; orgId?: string; keyId?: string }> {
  // Find all non-expired API keys (in production, use a more efficient approach)
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  })

  for (const apiKey of apiKeys) {
    const isValid = await verify(key, apiKey.keyHash)
    if (isValid) {
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })

      captureMessage('API key validated', 'debug', { keyId: apiKey.id, orgId: apiKey.orgId })

      return { valid: true, orgId: apiKey.orgId, keyId: apiKey.id }
    }
  }

  return { valid: false }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    await prisma.apiKey.delete({
      where: { id: keyId },
    })

    captureMessage(`API key revoked: ${keyId}`, 'info')
    return true
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), { keyId })
    return false
  }
}

/**
 * List API keys for an organization
 */
export async function listApiKeys(orgId: string): Promise<Array<{
  id: string
  name: string
  createdAt: Date
  expiresAt: Date | null
  lastUsedAt: Date | null
}>> {
  const keys = await prisma.apiKey.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
    },
  })

  return keys
}

/**
 * Revoke all API keys for an organization
 */
export async function revokeAllApiKeys(orgId: string): Promise<number> {
  const result = await prisma.apiKey.deleteMany({
    where: { orgId },
  })

  captureMessage(`All API keys revoked for org ${orgId}`, 'info', { count: result.count })
  return result.count
}

/**
 * Clean up expired API keys
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const result = await prisma.apiKey.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  if (result.count > 0) {
    captureMessage(`Cleaned up ${result.count} expired API keys`, 'info')
  }

  return result.count
}

/**
 * Generate a secure random key
 */
function generateSecureKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const keyLength = 64
  let key = ''
  
  // Use crypto for secure random generation
  const array = new Uint8Array(keyLength)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < keyLength; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }

  for (let i = 0; i < keyLength; i++) {
    key += chars[array[i] % chars.length]
  }

  return `dp_${key}` // Prefix for DataPresent
}

/**
 * Format key for display (show only first 8 chars)
 */
export function formatKeyForDisplay(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 8)}...${key.slice(-4)}`
}