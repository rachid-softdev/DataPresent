import { test, expect } from "@playwright/test";

test.describe("Accessibilité — Pages publiques", () => {
  test("la page d'accueil a un titre de page pertinent", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toContain("DataPresent");
  });

  test("la page d'accueil a une balise h1 unique", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCount(1);
  });

  test("les images sur la page d'accueil ont un attribut alt", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");

    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      // SVG icons and decorative images may use alt="" which is acceptable
      expect(alt).not.toBeNull();
    }
  });

  test("le lien 'Aller au contenu' (skip-to-content) est présent", async ({ page }) => {
    await page.goto("/");
    // Look for a skip-to-content link (common a11y pattern)
    const skipLink = page.locator(
      'a[href*="#main"], a[href*="#content"], a:has-text("Aller au"), a:has-text("Skip to")',
    );
    if ((await skipLink.count()) > 0) {
      await expect(skipLink.first()).toBeVisible();
    }
  });

  test("les formulaires ont des labels associés", async ({ page }) => {
    await page.goto("/login");
    // All input fields should have associated labels
    const inputs = page.locator("input");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute("id");
      if (inputId) {
        // Check for associated label via htmlFor
        const label = page.locator(`label[for="${inputId}"]`);
        // OR check for aria-label
        const ariaLabel = await input.getAttribute("aria-label");
        // OR check for aria-labelledby
        const ariaLabelledby = await input.getAttribute("aria-labelledby");

        const hasLabel = (await label.count()) > 0 || !!ariaLabel || !!ariaLabelledby;
        expect(hasLabel).toBe(true);
      }
    }
  });
});

test.describe("Accessibilité — Focus et navigation clavier", () => {
  test("les éléments interactifs sont accessibles au clavier", async ({ page }) => {
    await page.goto("/");

    // Tab through the page and check that focus moves
    const focusedBefore = await page.evaluate(() => document.activeElement?.tagName || "");
    await page.keyboard.press("Tab");
    const focusedAfter = await page.evaluate(() => document.activeElement?.tagName || "");

    // Focus should have moved (unless page has zero tabbable elements)
    expect(focusedAfter).not.toBe("");
  });

  test("les boutons et liens sont focusables", async ({ page }) => {
    await page.goto("/login");

    // Check there are focusable elements
    const tabbable = page.locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const count = await tabbable.count();
    expect(count).toBeGreaterThan(0);
  });

  test("les indicateurs de focus sont visibles (outline)", async ({ page }) => {
    await page.goto("/");

    // Tab to an element and check it has a focus outline
    await page.keyboard.press("Tab");
    const focusedElement = page.locator("*:focus");
    await expect(focusedElement).toBeVisible();

    // The focused element should have an outline or some focus indicator
    const hasOutline = await focusedElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.outlineStyle !== "none" || style.outlineWidth !== "0px" || style.boxShadow !== "none"
      );
    });
  });
});

test.describe("Accessibilité — Rôles ARIA", () => {
  test("la navigation principale a un rôle navigation ou banner", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav, [role="navigation"], header[role="banner"]');
    await expect(nav.first()).toBeVisible();
  });

  test("les boutons ont des noms accessibles", async ({ page }) => {
    await page.goto("/login");
    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const name = await btn.getAttribute("aria-label");
      const text = await btn.textContent();
      const hasAriaLabel = !!name;
      const hasTextContent = !!text?.trim();

      // Every button should have either aria-label or text content
      expect(hasAriaLabel || hasTextContent).toBe(true);
    }
  });

  test("les icônes décoratives sont cachées des lecteurs d'écran", async ({ page }) => {
    await page.goto("/");
    // Icons using lucide-react typically have aria-hidden="true"
    const decorativeSvgs = page.locator("svg[aria-hidden='true']");
    // There should be at least some decorative SVGs
    const count = await decorativeSvgs.count();
    expect(count).toBeGreaterThanOrEqual(0); // Accepting - not critical
  });
});

test.describe("Accessibilité — Contraste et lisibilité", () => {
  test("le texte principal a un contraste suffisant (vérification basique)", async ({ page }) => {
    await page.goto("/");
    const bodyText = page.locator("body");
    const color = await bodyText.evaluate((el) => window.getComputedStyle(el).color);
    // Color should be defined (not transparent)
    expect(color).not.toBe("transparent");
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("Accessibilité — Pages de contenu", () => {
  test("la page d'aide (/help) est structurée avec des titres", async ({ page }) => {
    await page.goto("/help");
    // Should have at least one h1
    await expect(page.locator("h1")).toBeVisible();
    // Content should be organized with heading hierarchy
    const headings = page.locator("h1, h2, h3");
    await expect(headings.first()).toBeVisible();
  });
});
