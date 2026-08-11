// Re-export the reports/[id]/export route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/export/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/export/.
export { POST } from "@/app/[locale]/api/reports/[id]/export/route";
