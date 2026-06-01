/**
 * XSS Sanitization utilities
 * Prevents cross-site scripting attacks by sanitizing user input
 */

import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import { env } from "@/env";

// Singleton DOMPurify instance (caching JSDOM creation for performance)
let purify: ReturnType<typeof DOMPurify>;
function getPurify() {
  if (!purify) {
    const window = new JSDOM("").window;
    purify = DOMPurify(window as any);
  }
  return purify;
}

/**
 * Strip all HTML tags and return plain text
 * @param html - HTML string to sanitize
 * @returns Sanitized plain text
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  const doc = new JSDOM(html).window.document;
  return doc.body.textContent || "";
}

/**
 * Sanitize HTML by removing dangerous tags and attributes
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  return getPurify().sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "span",
      "div",
      "table",
      "tr",
      "td",
      "th",
      "thead",
      "tbody",
    ],
    ALLOWED_ATTR: ["href", "class", "id"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize a string for use in HTML attribute
 * @param input - String to sanitize
 * @returns Sanitized string safe for attribute usage
 */
export function sanitizeAttribute(input: string): string {
  if (!input) return "";

  return input
    .replace(/[<>&"'=]/g, "") // Remove characters that could break attributes
    .trim();
}

/**
 * Sanitize a string for use in JavaScript context
 * @param input - String to sanitize
 * @returns Sanitized string safe for JS context
 */
export function sanitizeJs(input: string): string {
  if (!input) return "";

  return input
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/</g, "\\x3C") // Escape less than
    .replace(/>/g, "\\x3E"); // Escape greater than
}

/**
 * Sanitize a comment body
 * @param body - Comment body text
 * @returns Sanitized text safe for display
 */
export function sanitizeComment(body: string): string {
  if (!body) return "";

  // Use JSDOM to safely decode entities AND strip HTML in one step
  const doc = new JSDOM(body).window.document;
  let sanitized = doc.body.textContent || "";

  // HTML-entity-encode to prevent XSS via text content
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  // Limit length to prevent DoS
  const MAX_LENGTH = 5000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized.trim();
}

/**
 * Sanitize slide title or content
 * @param content - Slide content
 * @returns Sanitized content safe for storage/display
 */
export function sanitizeSlideContent(content: string): string {
  if (!content) return "";

  return sanitizeHtml(content);
}

/**
 * Validate that a URL is safe (same origin or allowed)
 * @param url - URL to validate
 * @returns True if URL is safe
 */
export function isUrlSafe(url: string): boolean {
  if (!url) return false;

  // Allow root-relative URLs (same origin)
  if (url.startsWith("/")) return true;

  try {
    const parsedUrl = new URL(url);

    // Allow relative URLs
    if (!parsedUrl.origin) return true;

    // Allow same origin
    const appUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const allowedOrigin = appUrl;
    if (parsedUrl.origin === allowedOrigin) {
      return true;
    }

    // Allow specific external domains
    const allowedDomains = ["docs.google.com", "sheets.google.com"];

    return allowedDomains.some((domain) => parsedUrl.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
