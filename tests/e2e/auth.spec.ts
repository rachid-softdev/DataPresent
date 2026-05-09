import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {
  test('la page de connexion est accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText(/connexion/i)
  })

  test('la page d\'inscription est accessible', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('h1')).toContainText(/inscription/i)
  })

  test('les liens entre login et signup fonctionnent', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Créer un compte')
    await expect(page).toHaveURL('/signup')
  })
})