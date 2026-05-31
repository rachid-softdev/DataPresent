/**
 * Normalize an email address:
 * - NFKC normalization
 * - Lowercase
 * - Trim whitespace
 *
 * If the input is not a string or is falsy, an empty string is returned.
 * Idempotent: normalizeEmail(x) === normalizeEmail(normalizeEmail(x))
 */
export function normalizeEmail(email: string): string {
  if (typeof email !== 'string' || !email) return ''
  return email.normalize('NFKC').toLowerCase().trim()
}
