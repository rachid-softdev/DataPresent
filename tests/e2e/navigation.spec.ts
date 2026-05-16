import { test, expect } from '@playwright/test'

test.describe('Navigation et Pages', () => {
  test('la page daccueil charge correctement', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText(/Transformez vos données/)
  })

  test('la navigation vers la tarification fonctionne', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Tarifs')
    await expect(page).toHaveURL(/#pricing/)
  })

  test('les liens du footer fonctionnent', async ({ page }) => {
    await page.goto('/')
    
    // Privacy page
    await page.click('text=Politique de confidentialité')
    await expect(page).toHaveURL(/privacy/)
  })
})

test.describe('Templates', () => {
  test('la page templates est accessible', async ({ page }) => {
    await page.goto('/templates')
    await expect(page.locator('h1')).toContainText(/Modèles/)
  })

  test('le filtrage par secteur fonctionne', async ({ page }) => {
    await page.goto('/templates')
    
    // Click on Finance filter
    await page.click('button:has-text("Finance")')
    
    // Should show only Finance templates
    await expect(page.locator('text=Finance')).toBeVisible()
  })
})

test.describe('Blog', () => {
  test('la page blog est accessible', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.locator('h1')).toContainText(/Blog/)
  })

  test('un article de blog est accessible', async ({ page }) => {
    await page.goto('/blog')
    
    // Click on first article
    const firstArticle = page.locator('a[href*="/blog/"]').first()
    await firstArticle.click()
    
    // Should have article content
    await expect(page.locator('article')).toBeVisible()
  })

  test('le blog a le bon SEO metadata', async ({ page }) => {
    await page.goto('/blog')
    
    // Check meta description exists
    const meta = page.locator('meta[name="description"]')
    await expect(meta).toHaveAttribute('content', /.+/ )
  })
})

test.describe('Auth', () => {
  test('la page login est accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText(/Connexion/)
  })

  test('la page signup est accessible', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('h1')).toContainText(/Créer un compte/)
  })

  test('les providers OAuth sont affichés', async ({ page }) => {
    await page.goto('/login')
    
    // Should show Google and/or other OAuth providers
    await expect(page.locator('button:has-text("Google")')).toBeVisible()
  })
})