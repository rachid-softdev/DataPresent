import { hash, verify } from '@node-rs/argon2'

/**
 * Hash a password using Argon2id
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    // Recommended parameters for password hashing
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    outputLen: 32,
    parallelism: 4,
  })
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Stored hash to compare against
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await verify(hash, password)
  } catch {
    return false
  }
}

/**
 * Validate password strength
 * Implements OWASP recommendations for password complexity
 * @param password - Password to validate
 * @returns True if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
  if (!password || password.length < 12) return false

  // Check for required character types
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  return hasUppercase && hasLowercase && hasNumber && hasSpecial
}

/**
 * Get password strength score (0-4)
 * @param password - Password to score
 * @returns Strength score
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0

  let score = 0
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  return Math.min(score, 4)
}