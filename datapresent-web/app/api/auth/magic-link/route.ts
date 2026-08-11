// Re-export the auth/magic-link route handler from its locale-prefixed location.
// This route lives under app/api/auth/magic-link/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/magic-link/.
export { POST } from "@/app/[locale]/api/auth/magic-link/route";
