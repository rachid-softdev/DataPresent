// Re-export the reports/[id]/stream route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/stream/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/stream/.
export { GET } from "@/app/[locale]/api/reports/[id]/stream/route";
