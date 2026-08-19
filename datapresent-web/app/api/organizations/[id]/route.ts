// Re-export the organizations/[id] route handler from its locale-prefixed location.
// This route lives under app/api/organizations/[id]/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/organizations/[id]/.
export { DELETE, GET, PATCH } from "@/app/[locale]/api/organizations/[id]/route";
