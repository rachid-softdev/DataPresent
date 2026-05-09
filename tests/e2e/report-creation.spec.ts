import { test, expect } from '@playwright/test'

test.describe('Création de rapport', () => {
  test('la page new requiert une authentification', async ({ page }) => {
    await page.goto('/new')
    await expect(page).toHaveURL(/login/)
  })

  test('le dashboard est accessible après login', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=DataPresent')).toBeVisible()
  })
})