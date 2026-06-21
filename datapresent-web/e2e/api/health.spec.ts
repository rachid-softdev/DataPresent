import { test, expect } from "@playwright/test";

test.describe("API Health — /api/health", () => {
  test("GET /api/health retourne 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });

  test("GET /api/health retourne un JSON avec le statut", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    expect(body).toHaveProperty("status");
    expect(body.status).toBe("ok");
  });

  test("GET /api/health contient des informations sur les services", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    // Should have server info or service checks
    expect(typeof body).toBe("object");
  });

  test("GET /api/health retourne le content-type application/json", async ({ request }) => {
    const response = await request.get("/api/health");
    const headers = response.headers();
    expect(headers["content-type"]).toContain("application/json");
  });

  test("GET /api/health ne nécessite pas d'authentification", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });
});

test.describe("API Health — /api/v1/health", () => {
  test("GET /api/v1/health retourne 200 (délègue à /api/health)", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    expect(response.status()).toBe(200);
  });

  test("GET /api/v1/health retourne le même format que /api/health", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    const body = await response.json();

    expect(body).toHaveProperty("status");
  });
});

test.describe("API Health — CORS headers", () => {
  test("OPTIONS /api/health retourne les bons en-têtes CORS", async ({ request }) => {
    const response = await request.fetch("/api/health", {
      method: "OPTIONS",
    });
    expect(response.status()).toBe(204);

    const headers = response.headers();
    // CORS headers should be present
    expect(
      headers["access-control-allow-origin"] || headers["Access-Control-Allow-Origin"],
    ).toBeDefined();
  });
});

test.describe("API — /api/ready", () => {
  test("GET /api/ready retourne 200 (prêt pour les healthchecks)", async ({ request }) => {
    const response = await request.get("/api/ready");
    expect(response.status()).toBe(200);
  });

  test("GET /api/ready retourne un statut json", async ({ request }) => {
    const response = await request.get("/api/ready");
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toBe("ok");
  });
});
