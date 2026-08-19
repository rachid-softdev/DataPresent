// Re-export the api-keys route handler from its locale-prefixed location.
// This route lives under app/api/api-keys/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/api-keys/.
export { DELETE, GET, POST } from "@/app/[locale]/api/api-keys/route";
