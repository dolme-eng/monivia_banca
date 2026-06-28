import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@monivia.it';
const ADMIN_PASSWORD = 'Admin@2026!';

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /accedi/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('admin dashboard shows stats', async ({ page }) => {
    await expect(page.getByText('Panoramica')).toBeVisible();
    await expect(page.getByText('Sicurezza')).toBeVisible();
  });

  test('admin can navigate to provisioning', async ({ page }) => {
    await page.getByRole('link', { name: /provisioning/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/provision/);
    await expect(page.getByText('Nuovo Client')).toBeVisible();
  });

  test('admin can navigate to approvals', async ({ page }) => {
    await page.getByRole('link', { name: /approvazioni/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/approvals/);
  });

  test('admin can navigate to timeline', async ({ page }) => {
    await page.getByRole('link', { name: /timeline/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/timeline/);
  });

  test('admin logout redirects to login', async ({ page }) => {
    await page.getByRole('button', { name: /esci/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
