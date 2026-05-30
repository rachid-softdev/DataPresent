import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from './password'

/**
 * Verify a user's password against the stored hash.
 * Returns false if the user has no password set.
 */
export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const stored = await prisma.password.findUnique({
    where: { userId }
  })
  if (!stored) return false
  return verifyPassword(password, stored.hash)
}

/**
 * Check if a user has a password set
 */
export async function userHasPassword(userId: string): Promise<boolean> {
  const stored = await prisma.password.findUnique({
    where: { userId },
    select: { id: true }
  })
  return stored !== null
}

/**
 * Set or update a user's password
 */
export async function setUserPassword(userId: string, password: string): Promise<void> {
  const hashed = await hashPassword(password)
  await prisma.password.upsert({
    where: { userId },
    create: { userId, hash: hashed },
    update: { hash: hashed },
  })
}
