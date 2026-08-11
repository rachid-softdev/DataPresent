// Re-export the auth/[...nextauth] route handler from its locale-prefixed location.
// This route lives under app/api/auth/[...nextauth]/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/auth/[...nextauth]/.
export { GET, POST } from "@/app/[locale]/api/auth/[...nextauth]/route";
