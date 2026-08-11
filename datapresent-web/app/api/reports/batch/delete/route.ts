// Re-export the reports/batch/delete route handler from its locale-prefixed location.
// This route lives under app/api/reports/batch/delete/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/batch/delete/.
export { POST } from "@/app/[locale]/api/reports/batch/delete/route";
