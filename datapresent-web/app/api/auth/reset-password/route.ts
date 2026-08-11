// Re-export the auth/reset-password route handler from its locale-prefixed location.
// This route lives under app/api/auth/reset-password/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/reset-password/.
export { POST } from "@/app/[locale]/api/auth/reset-password/route";
