import { test, expect } from '@playwright/test';

const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'markmarco319@gmail.com';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD!;

/**
 * Regression cover for two frontend bugs only a real browser can catch: no HTTP
 * test reaches them, because both live in the render/commit path.
 *
 * 1. ConfirmModal ran `useState`/`useEffect` after `if (!open) return null`, so
 *    opening any confirmation dialog threw "Rendered more hooks than during the
 *    previous render". The component stays mounted with open={false}, so the
 *    transition always happens on the same instance. That broke withdrawal,
 *    transfer, approval, purge and every admin action.
 * 2. AmountInput seeded `displayValue` once and never resynced, so quick amount
 *    buttons moved the real value while the field stayed blank.
 *
 * Deliberately ONE test, ONE login: Playwright hands each test a fresh context,
 * so a login per test exhausts the 5-attempts / 15-minutes limiter and the
 * failures land on the login page instead of on the assertions.
 */
test.describe('Confirmation modal and amount input', () => {
  test('quick amount fills the field, the dialog opens, cancels then confirms', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/login');
    await page.locator('#email').fill(CLIENT_EMAIL);
    await page.locator('#password').fill(CLIENT_PASSWORD);
    await page.getByRole('button', { name: /accedi/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    await page.goto('/dashboard/prelievo');
    const amount = page.locator('input[aria-label="Importo"]');
    // Client island: it fetches the account before rendering the form.
    await amount.waitFor({ state: 'visible', timeout: 25000 });
    await expect(amount).toHaveValue('');

    // --- Bug 2: the quick amount must reach the field ---
    await page.getByRole('button', { name: '100 \u20AC' }).click();
    await expect(amount).toHaveValue('100,00');

    await page.getByPlaceholder(/Prelievo/).fill('E2E annule');
    await page.getByRole('button', { name: /Richiedi Prelievo/i }).click();

    // --- Bug 1: opening the dialog used to throw and blank the page ---
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('100,00');

    await dialog.getByRole('button', { name: 'Annulla' }).click();
    await expect(dialog).toHaveCount(0);

    // Reopen and confirm for real: the full path an admin sees.
    await page.getByRole('button', { name: '500 \u20AC' }).click();
    await expect(amount).toHaveValue('500,00');
    await page.getByPlaceholder(/Prelievo/).fill('E2E confirme');
    await page.getByRole('button', { name: /Richiedi Prelievo/i }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /Conferma/i }).click();
    await page.getByText(/Richiesta inviata/i).waitFor({ timeout: 25000 });

    expect(errors, `erreurs console: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
