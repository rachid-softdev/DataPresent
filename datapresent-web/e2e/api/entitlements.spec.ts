import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { createTestUser, disconnectPrisma } from "../helpers/auth";
import { createTestOrganization } from "../helpers/db";

// ---------------------------------------------------------------------------
// Entitlements API:
//   GET /api/me/entitlements — current user's plan, features, limits, usage
//
// Response shape:
//   {
//     plan: "FREE" | "PRO" | "TEAM" | "AGENCY",
//     features: { [featureName]: boolean },
//     limits: { [limitName]: number },
//     usage: { [usageName]: number },
//     resetAt: { [usageName]: string | null }
//   }
// ---------------------------------------------------------------------------

test.describe("Entitlements API — GET /api/me/entitlements (authentifié)", () => {
  let db: PrismaClient;

  test.beforeAll(async () => {
    db = new PrismaClient();
  });

  test.afterAll(async () => {
    await db.$disconnect();
    await disconnectPrisma();
  });

  test("GET avec auth valide → 200 avec plan, features, limits, usage", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("plan");
    expect(body).toHaveProperty("features");
    expect(body).toHaveProperty("limits");
    expect(body).toHaveProperty("usage");
    expect(body).toHaveProperty("resetAt");
  });

  test("plan a une valeur valide (FREE/PRO/TEAM/AGENCY)", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();

    const validPlans = ["FREE", "PRO", "TEAM", "AGENCY"];
    expect(validPlans).toContain(body.plan);
  });

  test("features est un objet avec des clés booléennes", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();

    expect(typeof body.features).toBe("object");
    expect(body.features).not.toBeNull();
    expect(Object.keys(body.features).length).toBeGreaterThan(0);

    // Every feature value must be a boolean
    for (const [key, value] of Object.entries(body.features)) {
      expect(typeof value, `Feature "${key}" should be boolean`).toBe("boolean");
    }
  });

  test("limits a des valeurs numériques", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();

    expect(typeof body.limits).toBe("object");
    expect(body.limits).not.toBeNull();
    expect(Object.keys(body.limits).length).toBeGreaterThan(0);

    for (const [key, value] of Object.entries(body.limits)) {
      expect(typeof value, `Limit "${key}" should be a number`).toBe("number");
    }
  });

  test("usage a des valeurs numériques", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();

    expect(typeof body.usage).toBe("object");
    expect(body.usage).not.toBeNull();
    expect(Object.keys(body.usage).length).toBeGreaterThan(0);

    for (const [key, value] of Object.entries(body.usage)) {
      expect(typeof value, `Usage "${key}" should be a number`).toBe("number");
    }
  });

  test("resetAt contient des dates ISO ou null", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();

    expect(typeof body.resetAt).toBe("object");
    for (const [key, value] of Object.entries(body.resetAt)) {
      if (value !== null) {
        expect(typeof value, `resetAt.${key} should be a string or null`).toBe("string");
        // Should be a valid ISO date string
        expect(new Date(value as string).toISOString()).toBe(value);
      }
    }
  });

  test("Cache-Control header est présent", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const headers = res.headers();
    const cacheControl = headers["cache-control"] || headers["Cache-Control"] || "";
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("s-maxage");
  });

  test("POST sur /api/me/entitlements retourne 405", async ({ request }) => {
    const res = await request.post("/api/me/entitlements");
    expect(res.status()).toBe(405);
  });

  test("PUT sur /api/me/entitlements retourne 405", async ({ request }) => {
    const res = await request.put("/api/me/entitlements");
    expect(res.status()).toBe(405);
  });

  test("DELETE sur /api/me/entitlements retourne 405", async ({ request }) => {
    const res = await request.delete("/api/me/entitlements");
    expect(res.status()).toBe(405);
  });

  test("réponse est au format application/json", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });
});

test.describe("Entitlements API — GET /api/me/entitlements (non authentifié)", () => {
  test("sans auth → 401", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    expect(res.status()).toBe(401);
  });

  test("sans auth → erreur JSON avec 'error'", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});

// Note: "No org → 404" is hard to test because the auth fixture creates
// a user with an org. This scenario is covered at the unit/integration level.
test.describe("Entitlements API — cas limites", () => {
  test("contient les champs usage en lien avec les limites", async ({ request }) => {
    const res = await request.get("/api/me/entitlements");
    const body = await res.json();

    // Common usage keys that should exist for any plan
    const expectedUsageKeys = ["reports", "slides"];
    for (const key of expectedUsageKeys) {
      expect(body.usage).toHaveProperty(key);
    }

    // Common limits keys
    const expectedLimitKeys = ["maxReports", "maxSlides"];
    for (const key of expectedLimitKeys) {
      expect(body.limits).toHaveProperty(key);
    }
  });
});
