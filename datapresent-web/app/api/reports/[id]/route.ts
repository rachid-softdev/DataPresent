// Re-export the reports/[id] route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/.
export { GET, DELETE } from "@/app/[locale]/api/reports/[id]/route";
