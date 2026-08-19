// Re-export the user route handler from its locale-prefixed location.
// This route lives under app/api/user/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/user/.
export { DELETE, GET } from "@/app/[locale]/api/user/route";
