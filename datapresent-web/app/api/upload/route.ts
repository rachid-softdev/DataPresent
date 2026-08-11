// Re-export the upload route handler from its locale-prefixed location.
// This route lives under app/api/upload/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/upload/.
export { POST } from "@/app/[locale]/api/upload/route";
