// Re-export the user/profile route handler from its locale-prefixed location.
// This route lives under app/api/user/profile/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/user/profile/.
export { GET, PATCH } from "@/app/[locale]/api/user/profile/route";
