import { test, expect } from '@playwright/test'

test.describe('Partage de rapport', () => {
  test('une page de partage invalide affiche 404', async ({ page }) => {
    await page.goto('/share/invalid-token-12345')
    await expect(page.getByText(/non trouvé/i)).toBeVisible()
  })
})