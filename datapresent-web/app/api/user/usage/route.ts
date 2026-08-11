// Re-export the user/usage route handler from its locale-prefixed location.
// This route lives under app/api/user/usage/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/user/usage/.
export { GET } from "@/app/[locale]/api/user/usage/route";
