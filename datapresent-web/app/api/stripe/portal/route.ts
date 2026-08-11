// Re-export the stripe/portal route handler from its locale-prefixed location.
// This route lives under app/api/stripe/portal/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/stripe/portal/.
export { POST } from "@/app/[locale]/api/stripe/portal/route";
