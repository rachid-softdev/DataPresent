// Re-export the organizations/[id]/invite route handler from its locale-prefixed location.
// This route lives under app/api/organizations/[id]/invite/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/organizations/[id]/invite/.
export { POST } from "@/app/[locale]/api/organizations/[id]/invite/route";
