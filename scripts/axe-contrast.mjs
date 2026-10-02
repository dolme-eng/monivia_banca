import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Contrast sweep with axe-core, which implements the colour science properly
 * (D50 lab / D65 adaptation) instead of the hand-rolled conversion that
 * produced wrong numbers on Tailwind v4's oklab() output.
 *
 * Read-only: logs in, visits every page in both roles, reports colour-contrast
 * violations with the measured ratio axe computes.
 */
const CLIENT = { email: 'markmarco319@gmail.com', password: 'Marco453_34' };
const ADMIN = { email: 'admin@monivia.it', password: 'fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD' };

const browser = await chromium.launch();

async function sweep(label, creds, target, paths) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://banca.monivia.it/login', { waitUntil: 'networkidle' });
  await page.locator('#email').fill(creds.email);
  await page.locator('#password').fill(creds.password);
  await page.getByRole('button', { name: /accedi/i }).click();
  await page.waitForURL(target, { timeout: 30000 });

  let total = 0;
  for (const path of paths) {
    await page.goto(`https://banca.monivia.it${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const v = results.violations[0]?.nodes ?? [];
    total += v.length;
    console.log(`\n### ${path} — ${v.length} echec(s) de contraste`);
    v.slice(0, 6).forEach((n) => {
      const msg = (n.any[0]?.message || '').replace(/\s+/g, ' ').slice(0, 150);
      const t = (n.target[0] || '').slice(0, 40);
      console.log(`   ${msg}`);
      console.log(`      -> ${t}`);
    });
  }
  console.log(`\n===== ${label} : ${total} violation(s) au total =====`);
  await ctx.close();
}

await sweep('CLIENT', CLIENT, /dashboard/, [
  '/dashboard', '/dashboard/cards', '/dashboard/payments',
  '/dashboard/prelievo', '/dashboard/transactions', '/dashboard/settings',
]);

await sweep('ADMIN', ADMIN, /admin/, [
  '/admin', '/admin/dashboard', '/admin/accounts',
  '/admin/approvals', '/admin/cards', '/admin/timeline', '/admin/provision',
]);

await browser.close();
