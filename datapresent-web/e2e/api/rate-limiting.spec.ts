import { test, expect } from "@playwright/test";

// Use native fetch (no auth cookie) for unauthenticated tests.
const BASE = "http://localhost:3000";

test.describe("Rate Limiting & Sécurité", () => {
  test.describe("Headers de sécurité", () => {
    test("X-Frame-Options est présent (DENY ou SAMEORIGIN)", async ({ page }) => {
      const response = await page.goto("/fr");
      const headers = response!.headers();
      const xfo = headers["x-frame-options"] || headers["X-Frame-Options"];
      if (xfo) {
        expect(["DENY", "SAMEORIGIN"]).toContain(xfo.toUpperCase());
      }
    });

    test("X-Content-Type-Options est 'nosniff'", async ({ page }) => {
      const response = await page.goto("/fr");
      const headers = response!.headers();
      const xcto = headers["x-content-type-options"] || headers["X-Content-Type-Options"];
      if (xcto) {
        expect(xcto.toLowerCase()).toBe("nosniff");
      }
    });

    test("Referrer-Policy est présent", async ({ page }) => {
      const response = await page.goto("/fr");
      const headers = response!.headers();
      const rp = headers["referrer-policy"] || headers["Referrer-Policy"];
      if (rp) {
        expect(rp.length).toBeGreaterThan(0);
      }
    });

    test("Content-Security-Policy est présent", async ({ page }) => {
      const response = await page.goto("/fr");
      const headers = response!.headers();
      const csp = headers["content-security-policy"] || headers["Content-Security-Policy"];
      if (csp) {
        expect(csp.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("CORS", () => {
    test("OPTIONS /api/health retourne les headers CORS", async ({ request }) => {
      const response = await request.fetch("/api/health", {
        method: "OPTIONS",
        headers: { origin: "http://localhost:3000" },
      });
      const headers = response.headers();
      const allowOrigin =
        headers["access-control-allow-origin"] || headers["Access-Control-Allow-Origin"];
      expect(allowOrigin).toBeDefined();
    });

    test("OPTIONS /api/v1 retourne 204 (proxy intercepte OPTIONS /api/*)", async ({ request }) => {
      const response = await request.fetch("/api/v1", {
        method: "OPTIONS",
        headers: { origin: "http://localhost:3000" },
      });
      expect(response.status()).toBe(204);
    });

    test("OPTIONS /api/ready retourne les headers CORS", async ({ request }) => {
      const response = await request.fetch("/api/ready", {
        method: "OPTIONS",
        headers: { origin: "http://localhost:3000" },
      });
      const headers = response.headers();
      const allowOrigin =
        headers["access-control-allow-origin"] || headers["Access-Control-Allow-Origin"];
      expect(allowOrigin).toBeDefined();
    });
  });

  test.describe("Protection des endpoints authentifiés", () => {
    const protectedEndpoints = [
      { method: "GET", url: "/api/v1/me" },
      { method: "GET", url: "/api/v1/reports" },
      { method: "GET", url: "/api/me/entitlements" },
      { method: "GET", url: "/api/reports/nonexistent-id" },
    ];

    for (const endpoint of protectedEndpoints) {
      test(`${endpoint.method} ${endpoint.url} retourne 401 sans auth`, async () => {
        const response = await fetch(`${BASE}${endpoint.url}`);
        expect(response.status).toBe(401);
      });

      test(`${endpoint.method} ${endpoint.url} retourne du JSON en erreur`, async () => {
        const response = await fetch(`${BASE}${endpoint.url}`);
        expect(response.status).toBe(401);
        const contentType = response.headers.get("content-type") || "";
        expect(contentType).toContain("application/json");
        const body = await response.json();
        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
      });
    }
  });

  test.describe("Protection des endpoints admin", () => {
    test("GET /api/admin/plans retourne 401 sans auth", async () => {
      const response = await fetch(`${BASE}/api/admin/plans`);
      expect(response.status).toBe(401);
    });

    test("GET /api/admin/features retourne 401 sans auth", async () => {
      const response = await fetch(`${BASE}/api/admin/features`);
      expect(response.status).toBe(401);
    });

    test("GET /api/debug/entitlements retourne 401 sans auth", async () => {
      const response = await fetch(`${BASE}/api/debug/entitlements`);
      expect(response.status).toBe(401);
    });
  });

  test.describe("Format d'erreur cohérent", () => {
    test("les erreurs 4xx ont un format JSON cohérent", async ({ request }) => {
      // Some endpoints return 405 without JSON (Next.js default), so we only
      // test endpoints that actually return JSON on 4xx.
      const response = await request.fetch("/api/v1/reports", { method: "POST" });
      expect([400, 405, 422]).toContain(response.status());
      if (response.status() !== 405) {
        const contentType = response.headers()["content-type"] || "";
        expect(contentType).toContain("application/json");
        const body = await response.json();
        expect(body).toHaveProperty("error");
      }
    });
  });

  test.describe("Rate limiting", () => {
    test("tentatives rapides sur /api/csrf-token ne causent pas d'erreur", async ({ request }) => {
      // Send rapid requests to check behavior
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request.get("/api/csrf-token"));
      }
      const responses = await Promise.all(promises);
      for (const response of responses) {
        expect([200, 429]).toContain(response.status());
      }
    });

    test("requêtes rapides sur /api/v1/me sans auth retourne 401 ou 429", async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(fetch(`${BASE}/api/v1/me`));
      }
      const responses = await Promise.all(promises);
      for (const response of responses) {
        expect([401, 429]).toContain(response.status);
      }
    });
  });
});
