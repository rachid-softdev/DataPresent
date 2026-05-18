import { test, expect } from '@playwright/test'

// Note: These tests assume the user is authenticated via the test authentication
// In a real scenario, you would use authenticated session storage or test tokens

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Skip auth for now - in real tests would use authenticated context
  })

  test('la page new requiert une authentification', async ({ page }) => {
    await page.goto('/new')
    // Should redirect to login
    await expect(page).toHaveURL(/login|signup/)
  })

  test('la page reports requiert une authentification', async ({ page }) => {
    await page.goto('/reports')
    await expect(page).toHaveURL(/login|signup/)
  })

  test('la page settings requiert une authentification', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/login|signup/)
  })
})

test.describe('Share Page', () => {
  test('une page de partage invalide montre 404', async ({ page }) => {
    await page.goto('/share/invalid-token-12345')
    await expect(page.locator('text=404')).toBeVisible()
  })

  test('une page embed invalide montre 404', async ({ page }) => {
    await page.goto('/embed/invalid-token-12345')
    await expect(page.locator('text=404')).toBeVisible()
  })
})

test.describe('Pricing', () => {
  test('la page pricing affiche tous les plans', async ({ page }) => {
    await page.goto('/#pricing')
    
    // Should see FREE, PRO, TEAM plans
    await expect(page.locator('text=Free')).toBeVisible()
    await expect(page.locator('text=Pro')).toBeVisible()
    await expect(page.locator('text=Team')).toBeVisible()
  })

  test('le plan PRO est populaire', async ({ page }) => {
    await page.goto('/#pricing')
    
    // Should have a popular badge
    await expect(page.locator('text=Populaire')).toBeVisible()
  })
})

test.describe('Landing Page SEO', () => {
  test('la page a les meta tags corrects', async ({ page }) => {
    await page.goto('/')
    
    const title = await page.title()
    expect(title).toContain('DataPresent')
  })

  test('la page a les OpenGraph tags', async ({ page }) => {
    await page.goto('/')
    
    const ogImage = page.locator('meta[property="og:image"]')
    await expect(ogImage).toHaveAttribute('content', /.+/)
  })

  test('la page a les Twitter card tags', async ({ page }) => {
    await page.goto('/')
    
    const twitterCard = page.locator('meta[name="twitter:card"]')
    await expect(twitterCard).toHaveAttribute('content', 'summary_large_image')
  })
})