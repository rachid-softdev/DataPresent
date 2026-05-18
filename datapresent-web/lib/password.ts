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
 * @param password - Password to validate
 * @returns True if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
  // Minimum 8 characters, at least one letter
  return password.length >= 8 && /[a-zA-Z]/.test(password)
}