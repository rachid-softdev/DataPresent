// Re-export the auth/accept-invite route handler from its locale-prefixed location.
// This route lives under app/api/auth/accept-invite/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/accept-invite/.
export { POST } from "@/app/[locale]/api/auth/accept-invite/route";
