// ==========================================
// API Versioning constants and helpers
// ==========================================

export const API_VERSION = "1.0";

/**
 * V1 endpoint metadata for the version info endpoint.
 */
export const V1_ENDPOINTS = [
  { path: "/api/v1", methods: ["OPTIONS"], description: "Version info" },
  { path: "/api/v1/health", methods: ["GET"], description: "Health check" },
  { path: "/api/v1/me", methods: ["GET"], description: "Current user profile" },
  { path: "/api/v1/reports", methods: ["GET"], description: "List reports (paginated)" },
] as const;

/**
 * Build a fully qualified v1 URL from a relative path.
 * In production, uses the app URL; otherwise falls back to localhost.
 */
export function buildV1Url(path: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Use URL constructor to handle trailing slashes in base URL
  return new URL(normalizedPath, baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl).toString();
}
