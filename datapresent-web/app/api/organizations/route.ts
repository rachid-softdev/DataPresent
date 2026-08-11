// Re-export the organizations route handler from its locale-prefixed location.
// This route lives under app/api/organizations/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/organizations/.
export { GET, POST } from "@/app/[locale]/api/organizations/route";
