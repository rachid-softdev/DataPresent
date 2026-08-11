// Re-export the organizations/[id]/members route handler from its locale-prefixed location.
// This route lives under app/api/organizations/[id]/members/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/organizations/[id]/members/.
export { GET, POST, DELETE } from "@/app/[locale]/api/organizations/[id]/members/route";
