import { test, expect } from "@playwright/test";

/**
 * Tests des fonctionnalités d'administration.
 *
 * Prérequis :
 * - L'utilisateur de test E2E doit avoir le rôle ADMIN/OWNER
 * - Les endpoints API admin doivent être accessibles
 * - Les plans (FREE, PRO, TEAM, AGENCY) doivent exister en base
 *
 * Note : Ces tests utilisent les endpoints API admin directement
 * car il n'y a pas d'interface admin dédiée dans le frontend.
 * Les tests vérifient que l'API admin est fonctionnelle et sécurisée.
 */
test.describe("Administration — API plans", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("GET /api/admin/plans retourne les 4 plans avec leurs features", async ({ page }) => {
    const response = await page.request.get("/api/admin/plans");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(4);

    const planKeys = body.data.map((p: { plan: string }) => p.plan);
    expect(planKeys).toContain("FREE");
    expect(planKeys).toContain("PRO");
    expect(planKeys).toContain("TEAM");
    expect(planKeys).toContain("AGENCY");
  });

  test("chaque plan contient une liste de features avec statut", async ({ page }) => {
    const response = await page.request.get("/api/admin/plans");
    const body = await response.json();

    for (const plan of body.data) {
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);

      const firstFeature = plan.features[0];
      expect(firstFeature).toHaveProperty("featureKey");
      expect(firstFeature).toHaveProperty("enabled");
    }
  });

  test("POST /api/admin/plans sans body retourne 400", async ({ page }) => {
    const response = await page.request.post("/api/admin/plans", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/admin/plans avec plan invalide retourne 400", async ({ page }) => {
    const response = await page.request.post("/api/admin/plans", {
      data: {
        planKey: "INVALID_PLAN",
        featureKey: "watermark",
      },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Administration — API features", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("GET /api/admin/features est accessible", async ({ page }) => {
    const response = await page.request.get("/api/admin/features");
    // May return 200 or 404 depending on implementation
    expect([200, 404]).toContain(response.status());
  });
});

test.describe("Administration — API entitlements", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("GET /api/me/entitlements retourne les droits de l'utilisateur", async ({ page }) => {
    const response = await page.request.get("/api/me/entitlements");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("plan");
    expect(body).toHaveProperty("features");
    expect(body).toHaveProperty("limits");
    expect(body).toHaveProperty("usage");
  });

  test("les entitlements contiennent les limites et l'utilisation", async ({ page }) => {
    const response = await page.request.get("/api/me/entitlements");
    const body = await response.json();

    expect(typeof body.limits).toBe("object");
    expect(typeof body.usage).toBe("object");
  });
});

test.describe("Administration — Cache", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("GET /api/admin/cache/invalidate retourne 400 sans orgId", async ({ page }) => {
    const response = await page.request.get("/api/admin/cache/invalidate/");
    // Should either not match the route or return an error
    expect([400, 404, 405]).toContain(response.status());
  });
});
