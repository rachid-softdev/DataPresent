// Re-export the reports/[id]/comments route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/comments/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/comments/.
export { GET, POST } from "@/app/[locale]/api/reports/[id]/comments/route";
