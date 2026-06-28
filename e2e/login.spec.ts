import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('shows login page with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /accedi/i })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@test.it');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /accedi/i }).click();
    await expect(page.getByText('Credenziali non valide')).toBeVisible();
  });

  test('redirects authenticated user from login to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@monivia.it');
    await page.getByLabel('Password').fill('Admin@2026!');
    await page.getByRole('button', { name: /accedi/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('login form has accessible labels', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    const toggle = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await toggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
