import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { captureException, captureMessage } from '@/lib/sentry'
import { hashPassword, verifyPassword } from './password'

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
  const keyHash = await hashPassword(key)
  const keyPrefix = key.slice(0, 12) // First 12 chars for indexed lookup

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash,
      keyPrefix,
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
  const keyPrefix = key.slice(0, 12)

  // Find candidate keys by prefix (indexed lookup)
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyPrefix,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  })

  if (!apiKey) return { valid: false }

  // Single Argon2 verification instead of scanning all keys
  const isValid = await verifyPassword(key, apiKey.keyHash)
  if (isValid) {
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    captureMessage('API key validated', 'debug', { keyId: apiKey.id, orgId: apiKey.orgId })

    return { valid: true, orgId: apiKey.orgId, keyId: apiKey.id }
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
  const bytes = crypto.randomBytes(keyLength)
  let key = ''
  for (let i = 0; i < keyLength; i++) {
    key += chars[bytes[i] % chars.length]
  }
  return `dp_${key}`
}

/**
 * Format key for display (show only first 8 chars)
 */
export function formatKeyForDisplay(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 8)}...${key.slice(-4)}`
}