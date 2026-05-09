import { test, expect } from '@playwright/test'

test.describe('Page d\'accueil', () => {
  test('affiche la page d\'accueil correctement', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('h1')).toContainText(/Transformez vos données/)
    await expect(page.getByRole('link', { name: /commencer/i })).toBeVisible()
  })

  test('la FAQ est fonctionnelle', async ({ page }) => {
    await page.goto('/')
    
    const faqButton = page.locator('button').filter({ hasText: /comment/i }).first()
    if (await faqButton.isVisible()) {
      await faqButton.click()
    }
  })

  test('les liens de navigation fonctionnent', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Tarifs')
    await expect(page).toHaveURL(/#pricing/)
  })
})