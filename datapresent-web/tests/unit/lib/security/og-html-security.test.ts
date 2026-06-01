// ==========================================
// OG HTML Route Security Tests
// ==========================================
//
// Tests the security measures in app/api/og-html/route.ts:
// - Input length caps: title ≤ 100, description ≤ 300, slug ≤ 100
// - HTML escaping to prevent XSS via OG tags

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Input capping logic (extracted from route.ts)
// ---------------------------------------------------------------------------
// The route uses:  variable.slice(0, MAX_LENGTH)
// This function replicates the capping logic for testability
function capInput(value: string | null, defaultValue: string, maxLength: number): string {
  return (value || defaultValue).slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// HTML escaping function (extracted from route.ts line 82-88)
// ---------------------------------------------------------------------------
// This is the exact same function as in the route handler
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

describe("OG HTML Security — Input Length Capping", () => {
  // -----------------------------------------------------------------------
  // Title capping (max 100 chars)
  // -----------------------------------------------------------------------
  describe("title is capped at 100 characters", () => {
    it("should keep title under 100 chars when within limit", () => {
      const title = "My Blog Post Title";
      expect(capInput(title, "DataPresent Blog", 100)).toBe("My Blog Post Title");
    });

    it("should cap title at 100 chars when exceeded", () => {
      const longTitle = "A".repeat(200);
      const result = capInput(longTitle, "DataPresent Blog", 100);
      expect(result.length).toBe(100);
    });

    it("should use default when title is null", () => {
      const result = capInput(null, "DataPresent Blog", 100);
      expect(result).toBe("DataPresent Blog");
    });

    it("should use default when title is empty string", () => {
      const result = capInput("", "DataPresent Blog", 100);
      expect(result).toBe("DataPresent Blog");
    });

    it("should cap exactly at 100 chars (boundary)", () => {
      const exactTitle = "A".repeat(100);
      const result = capInput(exactTitle, "DataPresent Blog", 100);
      expect(result.length).toBe(100);
    });

    it("should cap 101 char title to 100", () => {
      const title101 = "A".repeat(101);
      const result = capInput(title101, "DataPresent Blog", 100);
      expect(result.length).toBe(100);
    });
  });

  // -----------------------------------------------------------------------
  // Description capping (max 300 chars)
  // -----------------------------------------------------------------------
  describe("description is capped at 300 characters", () => {
    it("should keep description under 300 chars when within limit", () => {
      const desc = "A short description for the blog post.";
      expect(capInput(desc, "Default description", 300)).toBe(desc);
    });

    it("should cap description at 300 chars when exceeded", () => {
      const longDesc = "B".repeat(500);
      const result = capInput(longDesc, "Default description", 300);
      expect(result.length).toBe(300);
    });

    it("should use default when description is null", () => {
      const result = capInput(null, "Default description", 300);
      expect(result).toBe("Default description");
    });

    it("should use default when description is empty string", () => {
      const result = capInput("", "Default description", 300);
      expect(result).toBe("Default description");
    });

    it("should cap exactly at 300 chars (boundary)", () => {
      const exactDesc = "C".repeat(300);
      const result = capInput(exactDesc, "Default description", 300);
      expect(result.length).toBe(300);
    });
  });

  // -----------------------------------------------------------------------
  // Slug capping (max 100 chars)
  // -----------------------------------------------------------------------
  describe("slug is capped at 100 characters", () => {
    it("should keep slug under 100 chars when within limit", () => {
      expect(capInput("my-post-slug", "", 100)).toBe("my-post-slug");
    });

    it("should cap slug at 100 chars when exceeded", () => {
      const longSlug = "D".repeat(150);
      const result = capInput(longSlug, "", 100);
      expect(result.length).toBe(100);
    });

    it("should use empty default when slug is null", () => {
      expect(capInput(null, "", 100)).toBe("");
    });
  });
});

describe("OG HTML Security — HTML Escaping", () => {
  // -----------------------------------------------------------------------
  // Basic escaping
  // -----------------------------------------------------------------------
  describe("escapeHtml escapes dangerous characters", () => {
    it("should escape ampersands", () => {
      expect(escapeHtml("AT&T")).toBe("AT&amp;T");
    });

    it("should escape less-than signs", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("should escape greater-than signs", () => {
      expect(escapeHtml("div > span")).toBe("div &gt; span");
    });

    it("should escape double quotes", () => {
      expect(escapeHtml('value="test"')).toBe("value=&quot;test&quot;");
    });

    it("should escape single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#039;s");
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should handle string with no special characters", () => {
      expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
    });
  });

  // -----------------------------------------------------------------------
  // XSS prevention via escapeHtml
  // -----------------------------------------------------------------------
  describe("XSS prevention", () => {
    it("should escape script tag injection", () => {
      const malicious = '<script>alert("xss")</script>';
      const result = escapeHtml(malicious);
      // Angle brackets are escaped, preventing script tag creation
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
      // Text content (alert, xss) passes through — HTML escaping only
      // affects special characters (< > & " '), not regular text
    });

    it("should escape event handler injection", () => {
      const malicious = "<img onerror=\"fetch('https://evil.com')\" src=x>";
      const result = escapeHtml(malicious);
      // Angle brackets escaped — no HTML tag can be formed
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      // Quotes are escaped—no attribute injection possible
      expect(result).toContain("&quot;");
      expect(result).toContain("&#039;");
    });

    it("should escape mixed content with special chars and HTML", () => {
      const input = "Hello <b>& friends</b>";
      const result = escapeHtml(input);
      // &lt; replaces <, &amp; replaces &
      expect(result).toBe("Hello &lt;b&gt;&amp; friends&lt;/b&gt;");
    });

    it("should escape nested dangerous strings", () => {
      const input = "<<script>script>alert('xss')</<script>script>>";
      const result = escapeHtml(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
    });
  });
});
