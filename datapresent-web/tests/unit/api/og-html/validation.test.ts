// ==========================================
// OG HTML Route — Input Validation Tests
// ==========================================
//
// Tests input length validation in app/api/og-html/route.ts:
// - title length validation (check > 200)
// - description length validation (check > 500)
// - slug length validation (check > 100)
// - Valid inputs within limits
//
// NOTE: The route applies .slice() caps BEFORE validation checks:
//   title.slice(0, 100) then checks > 200  (dead code — always ≤ 100 after slice)
//   description.slice(0, 300) then checks > 500  (dead code — always ≤ 300 after slice)
//   slug.slice(0, 100) then checks > 100  (dead code — always ≤ 100 after slice)
//
// These tests validate the route as-is. The actual enforcement mechanism
// is the .slice() call. The > N checks are defense-in-depth but unreachable
// with the current code structure.

import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock NextRequest
// ---------------------------------------------------------------------------
vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
}));

import { GET } from "@/app/api/og-html/route";

function createRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost:3000/api/og-html");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

describe("OG HTML — Input Validation", () => {
  // -----------------------------------------------------------------------
  // Title validation
  // -----------------------------------------------------------------------
  it("should accept title within 200 chars", async () => {
    const title = "A".repeat(200);
    const res = await GET(createRequest({ title }));

    // The route slices title at 100 before checking > 200,
    // so a 200-char title becomes 100 chars and passes
    expect(res.status).toBe(200);
  });

  it("should accept title with exactly 200 chars", async () => {
    const title = "A".repeat(200);
    const res = await GET(createRequest({ title }));

    // Sliced to 100, 100 is not > 200, returns HTML
    expect(res.status).toBe(200);
  });

  it("should accept short title", async () => {
    const res = await GET(createRequest({ title: "Short Title" }));

    expect(res.status).toBe(200);
  });

  it("should use default title when not provided", async () => {
    const res = await GET(createRequest({}));
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("DataPresent Blog");
  });

  // -----------------------------------------------------------------------
  // Description validation
  // -----------------------------------------------------------------------
  it("should accept description within 500 chars", async () => {
    const desc = "B".repeat(500);
    const res = await GET(createRequest({ description: desc }));

    // Sliced to 300 before checking > 500, so 300 is not > 500
    expect(res.status).toBe(200);
  });

  it("should accept short description", async () => {
    const res = await GET(createRequest({ description: "Short desc" }));

    expect(res.status).toBe(200);
  });

  it("should use default description when not provided", async () => {
    const res = await GET(createRequest({}));
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("Latest news, tips and insights");
  });

  // -----------------------------------------------------------------------
  // Slug validation
  // -----------------------------------------------------------------------
  it("should accept slug within 100 chars", async () => {
    const slug = "my-blog-post-slug";
    const res = await GET(createRequest({ slug }));

    expect(res.status).toBe(200);
  });

  it("should accept slug with exactly 100 chars", async () => {
    const slug = "C".repeat(100);
    const res = await GET(createRequest({ slug }));

    expect(res.status).toBe(200);
  });

  it("should handle empty slug", async () => {
    const res = await GET(createRequest({ slug: "" }));

    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // Combined valid inputs
  // -----------------------------------------------------------------------
  it("should accept valid inputs within all limits", async () => {
    const res = await GET(
      createRequest({
        title: "My Blog Post Title",
        description: "A short description for the blog post.",
        slug: "my-blog-post",
        locale: "fr",
      }),
    );

    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("My Blog Post Title");
    expect(html).toContain("A short description for the blog post");
    expect(html).toContain("my-blog-post");
  });

  // -----------------------------------------------------------------------
  // Input truncation (the real enforcement mechanism)
  // -----------------------------------------------------------------------
  it("should silently truncate title longer than 100 chars", async () => {
    const longTitle = "A".repeat(150);
    const res = await GET(createRequest({ title: longTitle }));
    const html = await res.text();

    // Title is sliced at 100, so the HTML should contain 100 'A's, not 150
    expect(html).toContain("A".repeat(100));
    expect(html).not.toContain("A".repeat(150));
    expect(res.status).toBe(200);
  });

  it("should silently truncate description longer than 300 chars", async () => {
    const longDesc = "B".repeat(400);
    const res = await GET(createRequest({ description: longDesc }));
    const html = await res.text();

    // Description is sliced at 300
    expect(html).toContain("B".repeat(300));
    expect(res.status).toBe(200);
  });

  it("should reject slug longer than 200 chars", async () => {
    // Route rejects raw input > 200 chars (slug check uses 100 after validation rejects over 100)
    const longSlug = "C".repeat(101);
    const res = await GET(createRequest({ slug: longSlug }));
    const text = await res.text();

    expect(text).toBe("Slug too long");
    expect(res.status).toBe(400);
  });

  // -----------------------------------------------------------------------
  // locale passthrough
  // -----------------------------------------------------------------------
  it("should pass locale through to the output", async () => {
    const res = await GET(createRequest({ locale: "fr", slug: "mon-billet" }));
    const html = await res.text();

    expect(html).toContain("/fr/blog/mon-billet");
  });

  it("should default locale to en", async () => {
    const res = await GET(createRequest({ slug: "post" }));
    const html = await res.text();

    expect(html).toContain("/en/blog/post");
  });
});
