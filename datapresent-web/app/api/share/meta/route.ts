// Re-export the share meta route handler from its locale-prefixed location.
// This route lives under app/api/share/meta/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/share/meta/.
export { GET } from "@/app/[locale]/api/share/meta/route";
