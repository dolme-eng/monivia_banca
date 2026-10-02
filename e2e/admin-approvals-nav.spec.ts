import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@monivia.it';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'markmarco319@gmail.com';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD!;

/**
 * Cover for the approvals screen, the one place where the app moves real money.
 *
 * The arrow is a client-side <Link>, so it is the only control on this page that
 * loads another route — and therefore the only one that can break on a missing
 * chunk after a deploy. It was reported producing Chrome's raw "This page
 * couldn't load".
 *
 * These tests create their own pending transaction instead of assuming one
 * exists: depending on ambient state made them pass or fail depending on who
 * had touched the queue before.
 */
test.describe('Admin approvals', () => {
  const stamp = Date.now();

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /accedi/i }).click();
    // Client-side redirect once the session cookie is set.
    await page.waitForURL(/\/admin\//, { timeout: 25000 });
  });

  /**
   * Seeds a PENDING withdrawal from the client account.
   *
   * Done over the API on purpose: the page context already holds the admin
   * session, and visiting /login while authenticated redirects straight to the
   * admin dashboard, so a UI login as the client is impossible in the same
   * context. Setting up through HTTP keeps the UI assertions honest and the
   * test independent of ambient queue state.
   */
  async function seedPending(
    request: import('@playwright/test').APIRequestContext,
    baseURL: string,
    label: string
  ) {
    const csrf = await request.get(`${baseURL}/api/csrf`);
    const token = (await csrf.json()).csrfToken;

    const login = await request.post(`${baseURL}/api/auth/login`, {
      headers: { 'x-csrf-token': token, Origin: baseURL },
      data: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD },
    });
    expect(login.ok(), 'login client').toBeTruthy();

    const account = await request.get(`${baseURL}/api/user/account`);
    const accountId = (await account.json()).user.accounts[0].id;

    const prelievo = await request.post(`${baseURL}/api/prelievo`, {
      headers: { 'x-csrf-token': token, Origin: baseURL },
      data: { accountId, amount: 100, description: label },
    });
    expect(prelievo.ok(), 'creation du prelevement').toBeTruthy();
  }

  test('the detail arrow opens the transaction detail page', async ({ page, request, baseURL }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await seedPending(request, baseURL!, `E2E fleche ${stamp}`);
    await page.goto('/admin/approvals');

    const arrow = page.locator('a[title="Vedi dettaglio"]').first();
    await arrow.waitFor({ state: 'visible', timeout: 20000 });

    await arrow.click();
    await page.waitForURL(/\/admin\/prelievo\/[0-9a-f-]{36}/, { timeout: 20000 });
    await expect(page.getByText('Dettaglio Transazione')).toBeVisible();

    // The raw browser error must never be what the admin sees.
    await expect(page.locator('body')).not.toContainText("couldn't load");
    expect(errors, `erreurs console: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('approve and reject are distinct, labelled controls', async ({ page, request, baseURL }) => {
    await seedPending(request, baseURL!, `E2E boutons ${stamp}`);
    await page.goto('/admin/approvals');

    const approve = page.getByRole('button', { name: 'Approva' }).first();
    await approve.waitFor({ state: 'visible', timeout: 20000 });

    // Both actions must be reachable and distinguishable. A mis-tap on an
    // unlabelled icon next to a money button is how the wrong thing gets approved.
    await expect(approve).toBeVisible();
    await expect(page.locator('a[title="Vedi dettaglio"]').first()).toBeVisible();
    await expect(page.locator('button[title="Rifiuta"]').first()).toBeVisible();

    await approve.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toContainText(/Approvare/i);
  });
});
