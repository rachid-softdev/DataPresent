// Re-export the stripe/webhook route handler from its locale-prefixed location.
// This route lives under app/api/stripe/webhook/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/stripe/webhook/.
export { POST } from "@/app/[locale]/api/stripe/webhook/route";
