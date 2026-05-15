/**
 * XSS Sanitization utilities
 * Prevents cross-site scripting attacks by sanitizing user input
 */

// @ts-expect-error - jsdom has no built-in types
import { JSDOM } from 'jsdom'

// Create a DOM environment for sanitization
const dom = new JSDOM('')
const window = dom.window
const Document = window.Document

/**
 * Strip all HTML tags and return plain text
 * @param html - HTML string to sanitize
 * @returns Sanitized plain text
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  const doc = new JSDOM(html).window.document
  return doc.body.textContent || ''
}

/**
 * Sanitize HTML by removing dangerous tags and attributes
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // List of allowed tags
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  ]

  // List of allowed attributes
  const allowedAttrs = ['href', 'class', 'id', 'style']

  // Tags to completely remove (including content)
  const removedTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input']

  let sanitized = html

  // Remove dangerous tags completely
  removedTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi')
    sanitized = sanitized.replace(regex, '')
  })

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: URLs (potential XSS)
  sanitized = sanitized.replace(/data:/gi, '')

  return sanitized
}

/**
 * Sanitize a string for use in HTML attribute
 * @param input - String to sanitize
 * @returns Sanitized string safe for attribute usage
 */
export function sanitizeAttribute(input: string): string {
  if (!input) return ''

  return input
    .replace(/[<>&"'=]/g, '') // Remove characters that could break attributes
    .trim()
}

/**
 * Sanitize a string for use in JavaScript context
 * @param input - String to sanitize
 * @returns Sanitized string safe for JS context
 */
export function sanitizeJs(input: string): string {
  if (!input) return ''

  return input
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "\\'")   // Escape single quotes
    .replace(/"/g, '\\"')   // Escape double quotes
    .replace(/</g, '\\x3C') // Escape less than
    .replace(/>/g, '\\x3E') // Escape greater than
}

/**
 * Sanitize a comment body
 * @param body - Comment body text
 * @returns Sanitized text safe for display
 */
export function sanitizeComment(body: string): string {
  if (!body) return ''

  // Strip HTML tags but preserve line breaks
  let sanitized = body
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Limit length to prevent DoS
  const MAX_LENGTH = 5000
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH)
  }

  return sanitized.trim()
}

/**
 * Sanitize slide title or content
 * @param content - Slide content
 * @returns Sanitized content safe for storage/display
 */
export function sanitizeSlideContent(content: string): string {
  if (!content) return ''

  return sanitizeHtml(content)
}

/**
 * Validate that a URL is safe (same origin or allowed)
 * @param url - URL to validate
 * @returns True if URL is safe
 */
export function isUrlSafe(url: string): boolean {
  if (!url) return false

  try {
    const parsedUrl = new URL(url)

    // Allow relative URLs
    if (!parsedUrl.origin) return true

    // Allow same origin
    const allowedOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://datapresent.com'
    if (parsedUrl.origin === allowedOrigin) {
      return true
    }

    // Allow specific external domains
    const allowedDomains = [
      'docs.google.com',
      'sheets.google.com',
    ]

    return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))
  } catch {
    return false
  }
}