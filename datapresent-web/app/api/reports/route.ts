// Re-export the reports route handler from its locale-prefixed location.
// This route lives under app/api/reports/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/.
export { GET } from "@/app/[locale]/api/reports/route";
