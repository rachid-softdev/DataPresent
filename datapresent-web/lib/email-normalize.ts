/**
 * Normalize an email address:
 * - NFKC normalization
 * - Lowercase
 * - Trim whitespace
 *
 * If the input is not a string or is falsy, it is returned as-is (fails open).
 * Idempotent: normalizeEmail(x) === normalizeEmail(normalizeEmail(x))
 */
export function normalizeEmail(email: string): string {
  if (typeof email !== 'string' || !email) return email
  return email.normalize('NFKC').toLowerCase().trim()
}
