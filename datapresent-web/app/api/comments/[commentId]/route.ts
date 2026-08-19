// Re-export the comments/[commentId] route handler from its locale-prefixed location.
// This route lives under app/api/comments/[commentId]/ for direct access without locale
// prefix, while the canonical implementation stays in app/[locale]/api/comments/[commentId]/.
export { DELETE, PATCH } from "@/app/[locale]/api/comments/[commentId]/route";
