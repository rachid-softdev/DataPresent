// Re-export the auth/signup route handler from its locale-prefixed location.
// This route lives under app/api/auth/signup/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/signup/.
export { POST } from "@/app/[locale]/api/auth/signup/route";
