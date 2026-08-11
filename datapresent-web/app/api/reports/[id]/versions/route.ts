// Re-export the reports/[id]/versions route handler from its locale-prefixed location.
// This route lives under app/api/reports/[id]/versions/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/reports/[id]/versions/.
export { GET } from "@/app/[locale]/api/reports/[id]/versions/route";
