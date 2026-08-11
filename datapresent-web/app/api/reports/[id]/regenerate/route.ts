// Re-export the reports/[id]/regenerate route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/regenerate/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/regenerate/.
export { POST } from "@/app/[locale]/api/reports/[id]/regenerate/route";
