import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Monivia/);
    await expect(page.getByText('MONIVIA')).toBeVisible();
  });

  test('homepage has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /monivia/i }).first()).toBeVisible();
  });

  test('login page is accessible from homepage', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /accedi/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Pagina non trovata')).toBeVisible();
  });

  test('404 page has return home link', async ({ page }) => {
    await page.goto('/non-existent-page');
    const homeLink = page.getByRole('link', { name: /torna alla home/i });
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });
});
