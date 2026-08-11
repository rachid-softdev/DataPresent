// Re-export the reports/[id]/generate route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/generate/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/generate/.
export { POST } from "@/app/[locale]/api/reports/[id]/generate/route";
