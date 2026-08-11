// Re-export the auth/forgot-password route handler from its locale-prefixed location.
// This route lives under app/api/auth/forgot-password/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/forgot-password/.
export { POST } from "@/app/[locale]/api/auth/forgot-password/route";
