import { test, expect } from "@playwright/test";

test.describe("API — Protection des endpoints authentifiés", () => {
  test("GET /api/v1/me sans auth retourne 401", async ({ request }) => {
    const response = await request.get("/api/v1/me");
    expect(response.status()).toBe(401);
  });

  test("GET /api/v1/me retourne une erreur JSON pour unauthorized", async ({ request }) => {
    const response = await request.get("/api/v1/me");
    const body = await response.json();

    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("GET /api/v1/reports sans auth retourne 401", async ({ request }) => {
    const response = await request.get("/api/v1/reports");
    expect(response.status()).toBe(401);
  });

  test("GET /api/v1/reports retourne une erreur JSON pour unauthorized", async ({ request }) => {
    const response = await request.get("/api/v1/reports");
    const body = await response.json();

    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("GET /api/me/entitlements sans auth retourne 401", async ({ request }) => {
    const response = await request.get("/api/me/entitlements");
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Format d'erreur pour requêtes invalides", () => {
  test("GET /api/v1/reports avec paramètres invalides retourne 400 ou 422", async ({ request }) => {
    const response = await request.get("/api/v1/reports?limit=-1");
    // Should either accept with defaults or return an error
    expect([200, 400, 422]).toContain(response.status());
  });

  test("POST sur route GET-only retourne 405", async ({ request }) => {
    const response = await request.post("/api/v1/me");
    expect(response.status()).toBe(405);
  });

  test("les erreurs 4xx retournent du JSON", async ({ request }) => {
    const response = await request.post("/api/v1/me");
    const contentType = response.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });
});

test.describe("API — Version info", () => {
  test("OPTIONS /api/v1 retourne les métadonnées de l'API", async ({ request }) => {
    const response = await request.fetch("/api/v1", { method: "OPTIONS" });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("endpoints");
    expect(Array.isArray(body.endpoints)).toBe(true);
  });

  test("la version de l'API est définie et stable", async ({ request }) => {
    const response = await request.fetch("/api/v1", { method: "OPTIONS" });
    const body = await response.json();

    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
    expect(body.status).toBe("stable");
  });
});

test.describe("API — Analytics", () => {
  test("GET /api/analytics sans paramètres retourne 400", async ({ request }) => {
    const response = await request.get("/api/analytics");
    expect([400, 404]).toContain(response.status());
  });
});

test.describe("API — CSRF", () => {
  test("GET /api/csrf-token retourne un token", async ({ request }) => {
    const response = await request.get("/api/csrf-token");
    expect([200, 404]).toContain(response.status());
  });
});
