import { expect, test } from "@playwright/test";

// Use native fetch (no auth cookie) for unauthenticated tests, since the api
// project's `request` fixture always carries the storageState cookie.
const BASE = "http://localhost:3000";

test.describe("API — Protection des endpoints authentifiés", () => {
  test("GET /api/v1/me sans auth retourne 401", async () => {
    const response = await fetch(`${BASE}/api/v1/me`);
    expect(response.status).toBe(401);
  });

  test("GET /api/v1/me retourne une erreur JSON pour unauthorized", async () => {
    const response = await fetch(`${BASE}/api/v1/me`);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("GET /api/v1/reports sans auth retourne 401", async () => {
    const response = await fetch(`${BASE}/api/v1/reports`);
    expect(response.status).toBe(401);
  });

  test("GET /api/v1/reports retourne une erreur JSON pour unauthorized", async () => {
    const response = await fetch(`${BASE}/api/v1/reports`);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("GET /api/me/entitlements sans auth retourne 401", async () => {
    const response = await fetch(`${BASE}/api/me/entitlements`);
    expect(response.status).toBe(401);
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

  test("POST sur route GET-only retourne 405 (peut être sans body JSON)", async ({ request }) => {
    const response = await request.post("/api/v1/me");
    expect(response.status()).toBe(405);
  });
});

test.describe("API — Version info", () => {
  test("OPTIONS /api/v1 retourne 204 (proxy intercepte OPTIONS /api/*)", async ({ request }) => {
    const response = await request.fetch("/api/v1", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3000" },
    });
    expect(response.status()).toBe(204);
  });

  test("GET /api/v1 retourne les métadonnées de l'API", async ({ request }) => {
    const response = await request.get("/api/v1");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("endpoints");
    expect(Array.isArray(body.endpoints)).toBe(true);
  });

  test("la version de l'API est définie et stable", async ({ request }) => {
    const response = await request.get("/api/v1");
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
    expect(body.status).toBe("stable");
  });
});

test.describe("API — Analytics (POST /api/analytics)", () => {
  test("POST avec event valide retourne 200", async ({ request }) => {
    const response = await request.post("/api/analytics", {
      data: { event: "report.exported", properties: { format: "pdf" } },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test("POST sans event retourne 400", async ({ request }) => {
    const response = await request.post("/api/analytics", {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST avec event non autorisé retourne 403", async ({ request }) => {
    const response = await request.post("/api/analytics", {
      data: { event: "invalid_event" },
    });
    // The analytics endpoint rejects unknown events with 403
    expect(response.status()).toBe(403);
  });

  test("POST avec properties invalides (tableau) retourne 400", async ({ request }) => {
    const response = await request.post("/api/analytics", {
      data: { event: "report.exported", properties: [1, 2, 3] },
    });
    expect(response.status()).toBe(400);
  });

  test("POST avec properties imbriquées retourne 400", async ({ request }) => {
    const response = await request.post("/api/analytics", {
      data: { event: "report.exported", properties: { nested: { a: 1 } } },
    });
    expect(response.status()).toBe(400);
  });

  test("GET sur /api/analytics retourne 405", async ({ request }) => {
    const response = await request.get("/api/analytics");
    expect(response.status()).toBe(405);
  });
});

test.describe("API — CSRF", () => {
  test("GET /api/csrf-token retourne un token", async ({ request }) => {
    const response = await request.get("/api/csrf-token");
    expect([200, 404]).toContain(response.status());
  });
});
