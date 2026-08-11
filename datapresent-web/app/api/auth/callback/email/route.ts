// Re-export the auth/callback/email route handler from its locale-prefixed location.
// This route lives under app/api/auth/callback/email/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/callback/email/.
export { GET, POST } from "@/app/[locale]/api/auth/callback/email/route";
