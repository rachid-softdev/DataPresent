import { expect, test } from "@playwright/test";

/**
 * Tests responsive du dashboard et des pages settings (authentifié).
 *
 * Viewports :
 *   - Mobile  : 375 × 812  (iPhone SE/XR)
 *   - Tablette : 768 × 1024 (iPad)
 *   - Desktop  : 1440 × 900
 *
 * Utilise storageState pour les tests authentifiés.
 * Le setup d'auth est géré par le projet `setup` dans playwright.config.ts.
 */

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  // Let framer-motion entrance transitions settle: step content slides in
  // from x+60, which momentarily extends scrollWidth.
  await page.waitForTimeout(450);
  // Small tolerance for cross-platform subpixel/font-rendering differences
  const result = await page.evaluate(() => {
    const tolerance = 4;
    const overflow = document.body.scrollWidth > window.innerWidth + tolerance;
    if (!overflow) return { overflow };
    const seen = new Set<string>();
    const wide: Array<{ tag: string; cls: string; right: number; offsetW?: number }> = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (
        r.right > window.innerWidth + tolerance ||
        el.offsetWidth > window.innerWidth + tolerance
      ) {
        const key = `${el.tagName}|${String(el.className).slice(0, 40)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        wide.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 70),
          right: Math.round(r.right),
          offsetW: el.offsetWidth,
        });
        if (wide.length >= 8) break;
      }
    }
    return {
      overflow,
      scrollW: document.body.scrollWidth,
      docScrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      wide,
    };
  });
  if (result.overflow) {
    console.log("OVERFLOW DETAIL:", JSON.stringify(result));
  }
  expect(result.overflow).toBe(false);
}

async function getCardCount(page: import("@playwright/test").Page) {
  // Report cards may use either .app-card or [class*="card"] or [class*="Card"]
  const cards = page.locator('[class*="card"] a[href^="/reports/"],a[href^="/reports/"]');
  const cardElements = page.locator('a[href^="/reports/"]');
  return await cardElements.count();
}

// ─────────────────────────────────────────────
// Mobile (375px)
// ─────────────────────────────────────────────

test.describe("Dashboard responsive — Mobile (375px)", () => {
  test.use({ storageState: "e2e/.auth/user.json", viewport: { width: 375, height: 812 } });

  test("pas de débordement horizontal sur le dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expectNoHorizontalOverflow(page);
  });

  test("le menu de navigation se réduit (hamburger ou nav cachée)", async ({ page }) => {
    await page.goto("/dashboard");
    // Check for hamburger-like button
    const hamburger = page.locator(
      'button[class*="menu"], button[aria-label*="menu"], button[class*="hamburger"], ' +
        'button[class*="mobile"], button[class*="Menu"], button[class*="Hamburger"]',
    );
    // Or the sidebar nav might be hidden
    const sidebar = page.locator('nav a[href*="reports"], .app-sidebar, [class*="sidebar"]');
    const isSidebarHidden =
      (await sidebar.count()) === 0 ||
      (await sidebar.evaluateAll((els) =>
        els.every((el) => {
          const style = window.getComputedStyle(el);
          return style.display === "none" || style.visibility === "hidden";
        }),
      ));
    const hasHamburger = (await hamburger.count()) > 0;
    // At least one of these should be true
    expect(hasHamburger || isSidebarHidden).toBe(true);
  });

  test("les cartes de rapport s'empilent en colonne unique", async ({ page }) => {
    await page.goto("/dashboard");
    // The grid on the dashboard should be single column at mobile
    const reportLinks = page.locator('a[href^="/reports/"]');
    const count = await reportLinks.count();
    // Even if there are no reports, the page should still be laid out
    if (count > 0) {
      // Get the first link's bounding box
      const firstBox = await reportLinks.first().boundingBox();
      expect(firstBox).not.toBeNull();
      if (firstBox) {
        // On mobile (375px), cards should span most of the width
        expect(firstBox.width).toBeGreaterThan(300);
      }
    }
  });

  test("le bouton 'Nouveau rapport' est adapté à la largeur mobile", async ({ page }) => {
    await page.goto("/dashboard");
    // The desktop nav link is hidden below lg — target the visible page CTA.
    const newReportBtn = page.locator('[data-onboarding="new-report"], main a[href="/new"]');
    await expect(newReportBtn.first()).toBeVisible();
    const box = await newReportBtn.first().boundingBox();
    expect(box).not.toBeNull();
  });

  test("la page /settings/profile est utilisable à 375px", async ({ page }) => {
    await page.goto("/settings/profile");
    // The form loads via a client fetch - wait for it before measuring.
    await expect(page.getByLabel(/nom|name/i).first()).toBeVisible({ timeout: 10000 });
    await expectNoHorizontalOverflow(page);
    // Form fields should be visible with reasonable width (allow narrower
    // on tiny screens). Retry: dev-mode hydration reloads can briefly
    // empty the DOM.
    await expect(async () => {
      const input = page.locator("input").first();
      await expect(input).toBeVisible();
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(200);
      }
    }).toPass({ timeout: 10000 });
  });

  test("la page /settings/billing affiche les cartes empilées", async ({ page }) => {
    await page.goto("/settings/billing");
    // Wait for the plan cards (server component, but be safe on cold loads).
    await expect(page.getByRole("heading", { name: /facturation|billing/i })).toBeVisible({
      timeout: 10000,
    });
    await expectNoHorizontalOverflow(page);
    // Plan cards should be visible
    const planCards = page.locator('[class*="card"], [class*="Card"]');
    const count = await planCards.count();
    if (count > 0) {
      const firstBox = await planCards.first().boundingBox();
      expect(firstBox).not.toBeNull();
      if (firstBox) {
        // On mobile, cards should span most of the viewport width
        expect(firstBox.width).toBeGreaterThan(280);
      }
    }
  });

  test("la page /settings/team est lisible sur mobile", async ({ page }) => {
    await page.goto("/settings/team");
    await expectNoHorizontalOverflow(page);
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("la page /reports est lisible sur mobile", async ({ page }) => {
    await page.goto("/reports");
    await expectNoHorizontalOverflow(page);
    // The reports page should have a heading
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// Tablet (768px)
// ─────────────────────────────────────────────

test.describe("Dashboard responsive — Tablette (768px)", () => {
  test.use({ storageState: "e2e/.auth/user.json", viewport: { width: 768, height: 1024 } });

  test("pas de débordement horizontal sur le dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expectNoHorizontalOverflow(page);
  });

  test("les cartes de rapport s'affichent en grille (2 colonnes minimum)", async ({ page }) => {
    await page.goto("/dashboard");
    const reportLinks = page.locator('a[href^="/reports/"]');
    const count = await reportLinks.count();
    if (count >= 2) {
      const firstBox = await reportLinks.first().boundingBox();
      const secondBox = await reportLinks.nth(1).boundingBox();
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      if (firstBox && secondBox) {
        // On tablet, if there's a multi-column grid, second card should be to the right
        const gridGap = secondBox.x - (firstBox.x + firstBox.width);
        // They should be side-by-side (gap < card width means they're in same row)
        expect(secondBox.x).toBeGreaterThan(firstBox.x);
      }
    }
  });

  test("la navigation est lisible sans débordement", async ({ page }) => {
    await page.goto("/dashboard");
    // Below lg the desktop nav links are hidden and the hamburger menu is
    // used — assert on the header itself, which is always visible.
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    if (headerBox) {
      expect(headerBox.width).toBeLessThanOrEqual(768);
    }
  });

  test("la sidebar des settings est visible ou en overlay", async ({ page }) => {
    await page.goto("/settings/profile");
    const sidebar = page.locator(".app-sidebar, aside");
    if ((await sidebar.count()) > 0) {
      const box = await sidebar.first().boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // On tablet, sidebar could be either full-width (collapsed state) or
        // a narrower panel. It should be visible either way.
        expect(box.width).toBeGreaterThan(100);
      }
    }
  });

  test("le dashboard affiche les statistiques sans cassure", async ({ page }) => {
    await page.goto("/dashboard");
    // Stats bar (text-muted-foreground spans)
    const stats = page.locator("text=/\\d+ rapports/");
    if ((await stats.count()) > 0) {
      await expect(stats.first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("la page /new est fonctionnelle sur tablette", async ({ page }) => {
    await page.goto("/new");
    await expectNoHorizontalOverflow(page);
  });
});

// ─────────────────────────────────────────────
// Desktop (1440px)
// ─────────────────────────────────────────────

test.describe("Dashboard responsive — Desktop (1440px)", () => {
  test.use({ storageState: "e2e/.auth/user.json", viewport: { width: 1440, height: 900 } });

  test("layout complet du dashboard visible", async ({ page }) => {
    await page.goto("/dashboard");
    await expectNoHorizontalOverflow(page);
    // Full layout: header, main content, cards
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    // Navigation sidebar should be fully visible
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });

  test("les cartes de rapport en grille 3 colonnes sur desktop", async ({ page }) => {
    await page.goto("/dashboard");
    const reportLinks = page.locator('a[href^="/reports/"]');
    const count = await reportLinks.count();
    if (count >= 3) {
      const boxes = await Promise.all([0, 1, 2].map((i) => reportLinks.nth(i).boundingBox()));
      if (boxes[0] && boxes[1] && boxes[2]) {
        // On desktop 1440px with lg:grid-cols-3, cards in a row share similar Y
        // and have increasing X positions
        expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
        // Third card could be in same row or second row
        expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[0].y);
      }
    }
  });

  test("la sidebar des settings est entièrement visible", async ({ page }) => {
    await page.goto("/settings/profile");
    const sidebar = page.locator(".app-sidebar");
    await expect(sidebar).toBeVisible();
    // Sidebar should show all nav items
    const navItems = sidebar.locator("a");
    const count = await navItems.count();
    expect(count).toBe(6); // Mon compte, Organisation, Équipe, Abonnement, API Keys, Sécurité
  });

  test("les champs du formulaire de profil ne débordent pas", async ({ page }) => {
    await page.goto("/settings/profile");
    // Wait for the client-loaded form before measuring.
    await expect(page.getByLabel(/nom|name/i).first()).toBeVisible({ timeout: 10000 });
    await expectNoHorizontalOverflow(page);
    const inputs = page.locator("input");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    // Inputs should have reasonable width on desktop
    if (count > 0) {
      const box = await inputs.first().boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThan(1440);
        expect(box.width).toBeGreaterThan(200);
      }
    }
  });

  test("la page /settings/billing affiche les plans en grille sur desktop", async ({ page }) => {
    await page.goto("/settings/billing");
    await expectNoHorizontalOverflow(page);
    // Plan cards should be in a row layout
    const planCards = page.locator('[class*="card"], [class*="Card"]');
    const count = await planCards.count();
    if (count >= 2) {
      const firstBox = await planCards.first().boundingBox();
      const secondBox = await planCards.nth(1).boundingBox();
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      if (firstBox && secondBox) {
        // On desktop, cards should be side by side
        expect(secondBox.x).toBeGreaterThan(firstBox.x);
      }
    }
  });

  test("la barre de statistiques du dashboard est lisible", async ({ page }) => {
    await page.goto("/dashboard");
    const statsBar = page.locator(".flex-wrap.gap-x-6, .text-muted-foreground strong");
    if ((await statsBar.count()) > 0) {
      await expect(statsBar.first()).toBeVisible();
    }
  });

  test("le tableau comparatif des prix est lisible sans scroll horizontal", async ({ page }) => {
    await page.goto("/settings/billing");
    // Check that the billing page has no horizontal overflow
    await expectNoHorizontalOverflow(page);
  });
});

// ─────────────────────────────────────────────
// Settings pages — responsive cross-check
// ─────────────────────────────────────────────

test.describe("Settings pages — responsive cross-check", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page /settings/organization est accessible", async ({ page }) => {
    await page.goto("/settings/organization");
    const body = page.locator("body");
    await expect(body).toBeVisible();
    const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
    expect(noOverflow).toBe(true);
  });

  test("la page /settings/api-keys est accessible", async ({ page }) => {
    await page.goto("/settings/api-keys");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("la page /settings/account est accessible", async ({ page }) => {
    await page.goto("/settings/account");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
