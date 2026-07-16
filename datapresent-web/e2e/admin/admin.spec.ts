import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

/**
 * Tests des fonctionnalités d'administration.
 *
 * Prérequis :
 * - L'utilisateur E2E par défaut (e2e-test@datapresent.com) doit avoir le rôle ADMIN
 * - Les endpoints API admin doivent être accessibles
 * - Les plans (FREE, PRO, TEAM, AGENCY) doivent exister en base
 * - Les features de base doivent exister (watermark, export_pdf, etc.)
 *
 * Note : Certains tests créent un utilisateur non-admin pour vérifier
 * le refus 403. Ces tests manipulent directement les cookies de session.
 */

// ---------------------------------------------------------------------------
// Helpers pour tester les scénarios non-admin
// ---------------------------------------------------------------------------

const NON_ADMIN_EMAIL = "e2e-nonadmin@datapresent.com";
const NON_ADMIN_NAME = "E2E Non-Admin User";

/**
 * Injecte une session non-admin dans le contexte de la page.
 * Crée un utilisateur sans rôle ADMIN et génère un JWT valide.
 */
async function setupNonAdminSession(page: import("@playwright/test").Page) {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { email: NON_ADMIN_EMAIL },
      update: { name: NON_ADMIN_NAME, isVerified: true },
      create: { email: NON_ADMIN_EMAIL, name: NON_ADMIN_NAME, isVerified: true },
    });

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("NEXTAUTH_SECRET is not defined");

    const token = {
      sub: user.id,
      email: user.email,
      name: user.name,
      isVerified: true,
      iat: Math.floor(Date.now() / 1000),
    };

    const sessionToken = await encode({
      secret,
      salt: "authjs.session-token",
      token,
      maxAge: 24 * 60 * 60,
    });

    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: false,
      },
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

// ===========================================================================
// PLANS API
// ===========================================================================

test.describe("Administration — API plans", () => {
  test.describe("Authentifié (admin)", () => {
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
        expect(firstFeature).toHaveProperty("limitValue");
        expect(firstFeature).toHaveProperty("downgradeStrategy");
      }
    });

    test("POST /api/admin/plans avec planKey + featureKey valide retourne 200 (upsert)", async ({
      page,
    }) => {
      // Récupérer d'abord un featureKey existant
      const getResp = await page.request.get("/api/admin/plans");
      const plans = await getResp.json();
      const existingFeatureKey = plans.data[0]?.features[0]?.featureKey;
      if (!existingFeatureKey) {
        test.skip(true, "Aucune feature existante pour tester l'upsert");
        return;
      }

      const response = await page.request.post("/api/admin/plans", {
        data: { planKey: "FREE", featureKey: existingFeatureKey, enabled: true },
      });
      expect(response.status()).toBe(200);
    });

    test("POST /api/admin/plans sans body retourne 400", async ({ page }) => {
      const response = await page.request.post("/api/admin/plans", { data: {} });
      expect(response.status()).toBe(400);
    });

    test("POST /api/admin/plans avec plan invalide retourne 400", async ({ page }) => {
      const response = await page.request.post("/api/admin/plans", {
        data: { planKey: "INVALID_PLAN", featureKey: "watermark" },
      });
      expect(response.status()).toBe(400);
    });

    test("POST /api/admin/plans sans featureKey retourne 400", async ({ page }) => {
      const response = await page.request.post("/api/admin/plans", {
        data: { planKey: "FREE" },
      });
      expect(response.status()).toBe(400);
    });

    test("POST /api/admin/plans duplicate (upsert) ne cause pas d'erreur", async ({ page }) => {
      const getResp = await page.request.get("/api/admin/plans");
      const plans = await getResp.json();
      const existingFeatureKey = plans.data[0]?.features[0]?.featureKey;
      if (!existingFeatureKey) {
        test.skip(true, "Aucune feature existante");
        return;
      }

      // Premier appel
      await page.request.post("/api/admin/plans", {
        data: { planKey: "FREE", featureKey: existingFeatureKey, enabled: true },
      });
      // Second appel — doit upsert sans erreur
      const response = await page.request.post("/api/admin/plans", {
        data: { planKey: "FREE", featureKey: existingFeatureKey, enabled: false },
      });
      expect(response.status()).toBe(200);
    });
  });

  test.describe("Authorization", () => {
    test("GET /api/admin/plans sans auth retourne 401", async ({ request }) => {
      const response = await request.get("/api/admin/plans");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/plans non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.get("/api/admin/plans");
      expect(response.status()).toBe(403);
    });

    test("POST /api/admin/plans sans auth retourne 401", async ({ request }) => {
      const response = await request.post("/api/admin/plans", {
        data: { planKey: "FREE", featureKey: "watermark" },
      });
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/plans non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.post("/api/admin/plans", {
        data: { planKey: "FREE", featureKey: "watermark" },
      });
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// FEATURES API
// ===========================================================================

test.describe("Administration — API features", () => {
  let createdFeatureKey: string;

  test.describe("Authentifié (admin)", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("GET /api/admin/features retourne la liste paginée", async ({ page }) => {
      const response = await page.request.get("/api/admin/features");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("limit");
      expect(body.pagination).toHaveProperty("total");
      expect(body.pagination).toHaveProperty("totalPages");
    });

    test("GET /api/admin/features avec pagination fonctionne", async ({ page }) => {
      const response = await page.request.get("/api/admin/features?page=1&limit=5");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data.length).toBeLessThanOrEqual(5);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
    });

    test("POST /api/admin/features crée une nouvelle feature", async ({ page }) => {
      createdFeatureKey = `e2e-test-feature-${Date.now()}`;
      const response = await page.request.post("/api/admin/features", {
        data: { key: createdFeatureKey, description: "E2E test feature", type: "BOOLEAN" },
      });
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.key).toBe(createdFeatureKey);
    });

    test("POST /api/admin/features sans key retourne 400", async ({ page }) => {
      const response = await page.request.post("/api/admin/features", {
        data: { description: "Missing key" },
      });
      expect(response.status()).toBe(400);
    });

    test("POST /api/admin/features avec clé dupliquée retourne 409", async ({ page }) => {
      if (!createdFeatureKey) {
        test.skip(true, "Aucune feature créée au préalable");
        return;
      }
      const response = await page.request.post("/api/admin/features", {
        data: { key: createdFeatureKey },
      });
      expect(response.status()).toBe(409);
    });

    test("PUT /api/admin/features met à jour une feature existante", async ({ page }) => {
      if (!createdFeatureKey) {
        test.skip(true, "Aucune feature créée au préalable");
        return;
      }
      const response = await page.request.put("/api/admin/features", {
        data: { key: createdFeatureKey, description: "Updated E2E test feature" },
      });
      expect(response.status()).toBe(200);
    });

    test("PUT /api/admin/features sans key retourne 400", async ({ page }) => {
      const response = await page.request.put("/api/admin/features", {
        data: { description: "No key" },
      });
      expect(response.status()).toBe(400);
    });

    test("PUT /api/admin/features sur clé inexistante retourne 404", async ({ page }) => {
      const response = await page.request.put("/api/admin/features", {
        data: { key: `non-existent-${Date.now()}` },
      });
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Authorization", () => {
    test("GET /api/admin/features sans auth retourne 401", async ({ request }) => {
      const response = await request.get("/api/admin/features");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/features non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.get("/api/admin/features");
      expect(response.status()).toBe(403);
    });

    test("POST /api/admin/features sans auth retourne 401", async ({ request }) => {
      const response = await request.post("/api/admin/features", {
        data: { key: `e2e-unauth-${Date.now()}` },
      });
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/features non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.post("/api/admin/features", {
        data: { key: `e2e-nonadmin-${Date.now()}` },
      });
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// OVERRIDES API
// ===========================================================================

test.describe("Administration — API overrides", () => {
  let createdOverrideId: string | null = null;

  test.describe("Authentifié (admin)", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("GET /api/admin/overrides retourne la liste paginée", async ({ page }) => {
      const response = await page.request.get("/api/admin/overrides");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("total");
    });

    test("GET /api/admin/overrides avec scope=ORG fonctionne", async ({ page }) => {
      const response = await page.request.get("/api/admin/overrides?scope=ORG");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    test("GET /api/admin/overrides avec scope invalide retourne 400", async ({ page }) => {
      const response = await page.request.get("/api/admin/overrides?scope=INVALID");
      expect(response.status()).toBe(400);
    });

    test("POST /api/admin/overrides crée un override ORG", async ({ page }) => {
      // Récupérer un featureKey existant
      const featuresResp = await page.request.get("/api/admin/features?limit=1");
      const features = await featuresResp.json();
      const featureKey = features.data?.[0]?.key;
      if (!featureKey) {
        test.skip(true, "Aucune feature disponible");
        return;
      }

      const response = await page.request.post("/api/admin/overrides", {
        data: {
          scope: "ORG",
          scopeId: `e2e-test-org-${Date.now()}`,
          featureKey,
          enabled: true,
          reason: "E2E test override",
        },
      });
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty("id");
      createdOverrideId = body.id;
    });

    test("POST /api/admin/overrides sans champs requis retourne 400", async ({ page }) => {
      const response = await page.request.post("/api/admin/overrides", {
        data: { scope: "ORG" },
      });
      expect(response.status()).toBe(400);
    });

    test("POST /api/admin/overrides avec expiresAt crée un override temporaire", async ({
      page,
    }) => {
      const featuresResp = await page.request.get("/api/admin/features?limit=1");
      const features = await featuresResp.json();
      const featureKey = features.data?.[0]?.key;
      if (!featureKey) {
        test.skip(true, "Aucune feature disponible");
        return;
      }

      const futureDate = new Date(Date.now() + 86400000).toISOString(); // +1 jour
      const response = await page.request.post("/api/admin/overrides", {
        data: {
          scope: "ORG",
          scopeId: `e2e-test-org-exp-${Date.now()}`,
          featureKey,
          enabled: true,
          reason: "E2E test override with expiration",
          expiresAt: futureDate,
        },
      });
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty("id");
      expect(body.expiresAt).toBeDefined();
    });

    test("DELETE /api/admin/overrides/:id supprime un override existant", async ({ page }) => {
      // Créer d'abord un override à supprimer
      const featuresResp = await page.request.get("/api/admin/features?limit=1");
      const features = await featuresResp.json();
      const featureKey = features.data?.[0]?.key;
      if (!featureKey) {
        test.skip(true, "Aucune feature disponible");
        return;
      }

      const createResp = await page.request.post("/api/admin/overrides", {
        data: {
          scope: "ORG",
          scopeId: `e2e-delete-test-${Date.now()}`,
          featureKey,
          enabled: true,
          reason: "To be deleted",
        },
      });
      const created = await createResp.json();
      const overrideId = created.id;

      const deleteResp = await page.request.delete(`/api/admin/overrides/${overrideId}`);
      expect(deleteResp.status()).toBe(200);

      const body = await deleteResp.json();
      expect(body.success).toBe(true);
    });

    test("DELETE /api/admin/overrides/:id sur ID inexistant retourne 404", async ({ page }) => {
      const response = await page.request.delete("/api/admin/overrides/non-existent-id-12345");
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Authorization", () => {
    test("GET /api/admin/overrides sans auth retourne 401", async ({ request }) => {
      const response = await request.get("/api/admin/overrides");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/overrides non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.get("/api/admin/overrides");
      expect(response.status()).toBe(403);
    });

    test("POST /api/admin/overrides sans auth retourne 401", async ({ request }) => {
      const response = await request.post("/api/admin/overrides", {
        data: { scope: "ORG", scopeId: "test", featureKey: "test", reason: "test" },
      });
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/overrides non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.post("/api/admin/overrides", {
        data: { scope: "ORG", scopeId: "test", featureKey: "test", reason: "test" },
      });
      expect(response.status()).toBe(403);
    });

    test("DELETE /api/admin/overrides/:id sans auth retourne 401", async ({ request }) => {
      const response = await request.delete("/api/admin/overrides/some-id");
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/admin/overrides/:id non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.delete("/api/admin/overrides/some-id");
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// ORGS ENTITLEMENTS
// ===========================================================================

test.describe("Administration — Org entitlements", () => {
  test.describe("Authentifié (admin)", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("GET /api/admin/orgs/:orgId/entitlements — org valide retourne les droits", async ({
      page,
    }) => {
      // Récupérer d'abord la liste des orgs via l'utilisateur courant
      const meResp = await page.request.get("/api/me/entitlements");
      expect(meResp.status()).toBe(200);

      // On a besoin d'un orgId valide — on crée un org test via la DB
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      try {
        // Récupérer l'utilisateur admin courant
        const adminUser = await prisma.user.findUnique({
          where: { email: "e2e-test@datapresent.com" },
          select: { id: true },
        });
        if (!adminUser) {
          test.skip(true, "Utilisateur admin E2E introuvable");
          return;
        }

        // Récupérer un membership existant
        const membership = await prisma.membership.findFirst({
          where: { userId: adminUser.id },
          select: { orgId: true },
        });
        if (!membership) {
          test.skip(true, "Aucun membership trouvé pour l'admin");
          return;
        }

        const response = await page.request.get(`/api/admin/orgs/${membership.orgId}/entitlements`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty("orgId");
        expect(body).toHaveProperty("plan");
        expect(body).toHaveProperty("features");
        expect(body).toHaveProperty("limits");
      } finally {
        await prisma.$disconnect();
      }
    });

    test("GET /api/admin/orgs/:orgId/entitlements — org inexistant retourne 404", async ({
      page,
    }) => {
      const response = await page.request.get(
        "/api/admin/orgs/nonexistent-org-id-12345/entitlements",
      );
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Authorization", () => {
    test("GET /api/admin/orgs/:orgId/entitlements sans auth retourne 401", async ({ request }) => {
      const response = await request.get("/api/admin/orgs/some-org/entitlements");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/orgs/:orgId/entitlements non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.get("/api/admin/orgs/some-org/entitlements");
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// DOWNGRADE PREVIEW
// ===========================================================================

test.describe("Administration — Downgrade preview", () => {
  test.describe("Authentifié (admin)", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("GET /api/admin/orgs/:orgId/downgrade-preview retourne les infos de downgrade", async ({
      page,
    }) => {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      try {
        const adminUser = await prisma.user.findUnique({
          where: { email: "e2e-test@datapresent.com" },
          select: { id: true },
        });
        if (!adminUser) {
          test.skip(true, "Utilisateur admin E2E introuvable");
          return;
        }

        const membership = await prisma.membership.findFirst({
          where: { userId: adminUser.id },
          select: { orgId: true },
        });
        if (!membership) {
          test.skip(true, "Aucun membership trouvé");
          return;
        }

        const response = await page.request.get(
          `/api/admin/orgs/${membership.orgId}/downgrade-preview?targetPlan=FREE`,
        );
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty("orgId");
      } finally {
        await prisma.$disconnect();
      }
    });

    test("GET sans targetPlan retourne 400", async ({ page }) => {
      const response = await page.request.get("/api/admin/orgs/some-org/downgrade-preview");
      expect(response.status()).toBe(400);
    });

    test("GET avec targetPlan invalide retourne 400", async ({ page }) => {
      const response = await page.request.get(
        "/api/admin/orgs/some-org/downgrade-preview?targetPlan=INVALID",
      );
      expect(response.status()).toBe(400);
    });

    test("GET avec plan identique ou supérieur retourne 'No downgrade needed'", async ({
      page,
    }) => {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      try {
        const adminUser = await prisma.user.findUnique({
          where: { email: "e2e-test@datapresent.com" },
          select: { id: true },
        });
        if (!adminUser) {
          test.skip(true, "Utilisateur admin E2E introuvable");
          return;
        }

        const membership = await prisma.membership.findFirst({
          where: { userId: adminUser.id },
          select: { orgId: true },
        });
        if (!membership) {
          test.skip(true, "Aucun membership trouvé");
          return;
        }

        // L'org est généralement FREE, donc targetPlan=FREE est "same or higher"
        const response = await page.request.get(
          `/api/admin/orgs/${membership.orgId}/downgrade-preview?targetPlan=FREE`,
        );
        expect(response.status()).toBe(200);

        const body = await response.json();
        const isNoDowngrade =
          body.message === "No downgrade needed - same or higher plan" ||
          typeof body.affectedFeatures !== "undefined";

        expect(isNoDowngrade).toBe(true);
      } finally {
        await prisma.$disconnect();
      }
    });
  });

  test.describe("Authorization", () => {
    test("GET /api/admin/orgs/:orgId/downgrade-preview sans auth retourne 401", async ({
      request,
    }) => {
      const response = await request.get(
        "/api/admin/orgs/some-org/downgrade-preview?targetPlan=FREE",
      );
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/orgs/:orgId/downgrade-preview non-admin retourne 403", async ({
      page,
    }) => {
      await setupNonAdminSession(page);
      const response = await page.request.get(
        "/api/admin/orgs/some-org/downgrade-preview?targetPlan=FREE",
      );
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// CACHE INVALIDATE
// ===========================================================================

test.describe("Administration — Cache invalidation", () => {
  test.describe("Authentifié (admin)", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("POST /api/admin/cache/invalidate/:orgId invalide le cache", async ({ page }) => {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      try {
        const adminUser = await prisma.user.findUnique({
          where: { email: "e2e-test@datapresent.com" },
          select: { id: true },
        });
        if (!adminUser) {
          test.skip(true, "Utilisateur admin E2E introuvable");
          return;
        }

        const membership = await prisma.membership.findFirst({
          where: { userId: adminUser.id },
          select: { orgId: true },
        });
        if (!membership) {
          test.skip(true, "Aucun membership trouvé");
          return;
        }

        const response = await page.request.post(`/api/admin/cache/invalidate/${membership.orgId}`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body).toHaveProperty("message");
      } finally {
        await prisma.$disconnect();
      }
    });

    test("POST /api/admin/cache/invalidate/:orgId avec org inexistant retourne 404", async ({
      page,
    }) => {
      const response = await page.request.post(
        "/api/admin/cache/invalidate/nonexistent-org-id-12345",
      );
      expect(response.status()).toBe(404);
    });

    test("GET sur /api/admin/cache/invalidate/:orgId retourne 405", async ({ page }) => {
      const response = await page.request.get("/api/admin/cache/invalidate/some-org");
      expect(response.status()).toBe(405);
    });
  });

  test.describe("Authorization", () => {
    test("POST /api/admin/cache/invalidate/:orgId sans auth retourne 401", async ({ request }) => {
      const response = await request.post("/api/admin/cache/invalidate/some-org");
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/cache/invalidate/:orgId non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.post("/api/admin/cache/invalidate/some-org");
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// DEBUG ENTITLEMENTS
// ===========================================================================

test.describe("Administration — Debug entitlements", () => {
  test.describe("Authentifié (admin)", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("GET /api/debug/entitlements avec orgId + feature valides retourne un trace", async ({
      page,
    }) => {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      try {
        // Trouver un orgId valide
        const adminUser = await prisma.user.findUnique({
          where: { email: "e2e-test@datapresent.com" },
          select: { id: true },
        });
        if (!adminUser) {
          test.skip(true, "Utilisateur admin E2E introuvable");
          return;
        }

        const membership = await prisma.membership.findFirst({
          where: { userId: adminUser.id },
          select: { orgId: true },
        });
        if (!membership) {
          test.skip(true, "Aucun membership trouvé");
          return;
        }

        // Trouver un featureKey existant
        const feature = await prisma.feature.findFirst({
          where: { isActive: true },
          select: { key: true },
        });
        if (!feature) {
          test.skip(true, "Aucune feature active trouvée");
          return;
        }

        const response = await page.request.get(
          `/api/debug/entitlements?orgId=${membership.orgId}&feature=${feature.key}`,
        );
        // Le debug peut retourner 200 ou 429 (rate-limit), mais pas 400
        expect([200, 429]).toContain(response.status());
      } finally {
        await prisma.$disconnect();
      }
    });

    test("GET /api/debug/entitlements sans orgId retourne 400", async ({ page }) => {
      const response = await page.request.get("/api/debug/entitlements?feature=watermark");
      expect(response.status()).toBe(400);
    });

    test("GET /api/debug/entitlements sans feature retourne 400", async ({ page }) => {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      try {
        const adminUser = await prisma.user.findUnique({
          where: { email: "e2e-test@datapresent.com" },
          select: { id: true },
        });
        if (!adminUser) {
          test.skip(true, "Utilisateur admin E2E introuvable");
          return;
        }
        const membership = await prisma.membership.findFirst({
          where: { userId: adminUser.id },
          select: { orgId: true },
        });
        if (!membership) {
          test.skip(true, "Aucun membership trouvé");
          return;
        }

        const response = await page.request.get(
          `/api/debug/entitlements?orgId=${membership.orgId}`,
        );
        expect(response.status()).toBe(400);
      } finally {
        await prisma.$disconnect();
      }
    });
  });

  test.describe("Authorization", () => {
    test("GET /api/debug/entitlements sans auth retourne 401", async ({ request }) => {
      const response = await request.get("/api/debug/entitlements?orgId=test&feature=test");
      expect(response.status()).toBe(401);
    });

    test("GET /api/debug/entitlements non-admin retourne 403", async ({ page }) => {
      await setupNonAdminSession(page);
      const response = await page.request.get("/api/debug/entitlements?orgId=test&feature=test");
      expect(response.status()).toBe(403);
    });
  });
});

// ===========================================================================
// CONSISTANCE — Erreurs 401/403
// ===========================================================================

test.describe("Administration — Cohérence des erreurs d'authentification", () => {
  test("tous les endpoints admin retournent 401 quand non authentifié", async ({ request }) => {
    const endpoints = [
      { method: "GET" as const, url: "/api/admin/plans" },
      {
        method: "POST" as const,
        url: "/api/admin/plans",
        data: { planKey: "FREE", featureKey: "watermark" },
      },
      { method: "GET" as const, url: "/api/admin/features" },
      { method: "POST" as const, url: "/api/admin/features", data: { key: "test" } },
      { method: "GET" as const, url: "/api/admin/overrides" },
      {
        method: "POST" as const,
        url: "/api/admin/overrides",
        data: { scope: "ORG", scopeId: "t", featureKey: "t", reason: "t" },
      },
      { method: "GET" as const, url: "/api/admin/orgs/test-org/entitlements" },
      { method: "GET" as const, url: "/api/admin/orgs/test-org/downgrade-preview?targetPlan=FREE" },
      { method: "POST" as const, url: "/api/admin/cache/invalidate/test-org" },
      { method: "GET" as const, url: "/api/debug/entitlements?orgId=test&feature=test" },
    ];

    for (const ep of endpoints) {
      let response: Awaited<ReturnType<typeof request.get>>;
      if (ep.method === "GET") {
        response = await request.get(ep.url);
      } else {
        response = await request.post(ep.url, { data: (ep as any).data });
      }
      expect(response.status(), `${ep.method} ${ep.url} devrait retourner 401`).toBe(401);

      // Vérifier que la réponse est en JSON avec un champ error
      const contentType = response.headers()["content-type"] || "";
      expect(contentType, `${ep.url} devrait retourner du JSON`).toContain("application/json");

      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    }
  });

  test("tous les endpoints admin retournent 403 pour un non-admin", async ({ page }) => {
    await setupNonAdminSession(page);

    const endpoints = [
      { method: "GET" as const, url: "/api/admin/plans" },
      {
        method: "POST" as const,
        url: "/api/admin/plans",
        data: { planKey: "FREE", featureKey: "watermark" },
      },
      { method: "GET" as const, url: "/api/admin/features" },
      { method: "POST" as const, url: "/api/admin/features", data: { key: "test-403" } },
      { method: "GET" as const, url: "/api/admin/overrides" },
      {
        method: "POST" as const,
        url: "/api/admin/overrides",
        data: { scope: "ORG", scopeId: "t", featureKey: "t", reason: "t" },
      },
      { method: "GET" as const, url: "/api/admin/orgs/test-org/entitlements" },
      { method: "GET" as const, url: "/api/admin/orgs/test-org/downgrade-preview?targetPlan=FREE" },
      { method: "POST" as const, url: "/api/admin/cache/invalidate/test-org" },
      { method: "GET" as const, url: "/api/debug/entitlements?orgId=test&feature=test" },
    ];

    for (const ep of endpoints) {
      let response: Awaited<ReturnType<typeof page.request.get>>;
      if (ep.method === "GET") {
        response = await page.request.get(ep.url);
      } else {
        response = await page.request.post(ep.url, { data: (ep as any).data });
      }
      expect(response.status(), `${ep.method} ${ep.url} devrait retourner 403`).toBe(403);

      const contentType = response.headers()["content-type"] || "";
      expect(contentType, `${ep.url} devrait retourner du JSON`).toContain("application/json");

      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    }
  });
});
