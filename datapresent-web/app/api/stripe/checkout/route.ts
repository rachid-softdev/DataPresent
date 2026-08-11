// Re-export the stripe/checkout route handler from its locale-prefixed location.
// This route lives under app/api/stripe/checkout/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/stripe/checkout/.
export { POST } from "@/app/[locale]/api/stripe/checkout/route";
