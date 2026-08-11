// Re-export the reports/[id]/reorder route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/reorder/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/reorder/.
export { PATCH } from "@/app/[locale]/api/reports/[id]/reorder/route";
