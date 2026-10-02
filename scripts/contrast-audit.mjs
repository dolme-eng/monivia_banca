import { chromium } from "playwright";

/**
 * Measures real contrast on every page, in both roles.
 *
 * Writes nothing and changes nothing: it walks the rendered DOM, resolves each
 * element's effective background (climbing ancestors until an opaque colour),
 * and reports the ones below WCAG AA. Blindly rewriting `text-secondary` would
 * darken the cyan logo on the dark sidebar too, where it already passes, so
 * every fix has to be driven by a measured failure.
 */
const CLIENT = { email: 'markmarco319@gmail.com', password: 'Marco453_34' };
const ADMIN = { email: 'admin@monivia.it', password: 'fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD' };

const audit = () => {
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (fg, bg) => {
    const l1 = lum(...fg), l2 = lum(...bg);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  };
  const parse = (c) => {
    // Tailwind v4 emits oklch()/color-mix(); a naive regex read those as sRGB
    // and produced nonsense ratios. Letting the browser normalise through a
    // canvas is the only reliable conversion.
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const m = parse(c);
      if (m[3] > 0) return [m[0], m[1], m[2]];
      n = n.parentElement;
    }
    return [255, 255, 255];
  };

  const out = [];
  const seen = new Set();
  document.querySelectorAll('a,button,label,p,span,h1,h2,h3,li,td,th').forEach((el) => {
    if (el.querySelector('a,button,input,select,textarea')) return;
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 70) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.4) return;
    const key = txt.slice(0, 30) + cs.color + cs.fontSize;
    if (seen.has(key)) return;
    seen.add(key);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const fg = parse(cs.color);
    if (fg[3] < 0.4) return; // fully transparent text is not rendered
    const r = ratio([fg[0], fg[1], fg[2]], bgOf(el));
    if (r < need) out.push({ txt: txt.slice(0, 40), r: +r.toFixed(2), need, size: Math.round(size) });
  });
  return out;
};

const browser = await chromium.launch();

async function loginAs(ctx, creds, pattern) {
  const page = await ctx.newPage();
  await page.goto('https://banca.monivia.it/login', { waitUntil: 'networkidle' });
  await page.locator('#email').fill(creds.email);
  await page.locator('#password').fill(creds.password);
  await page.getByRole('button', { name: /accedi/i }).click();
  await page.waitForURL(pattern, { timeout: 30000 });
  return page;
}

// --- public ---
{
  const page = await (await browser.newContext()).newPage();
  for (const path of ['/', '/login', '/forgot-password']) {
    await page.goto(`https://banca.monivia.it${path}`, { waitUntil: 'networkidle' });
    const fails = await page.evaluate(audit);
    console.log(`\n### ${path} : ${fails.length} echec(s)`);
    fails.slice(0, 8).forEach((f) => console.log(`   ${String(f.r).padStart(5)} (min ${f.need}) ${f.size}px  "${f.txt}"`));
  }
  await page.close();
}

// --- client (one login for the whole section) ---
{
  const ctx = await browser.newContext();
  const page = await loginAs(ctx, CLIENT, /dashboard/);
  for (const path of ['/dashboard', '/dashboard/cards', '/dashboard/payments', '/dashboard/prelievo', '/dashboard/transactions', '/dashboard/settings']) {
    await page.goto(`https://banca.monivia.it${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const fails = await page.evaluate(audit);
    console.log(`\n### ${path} : ${fails.length} echec(s)`);
    fails.slice(0, 8).forEach((f) => console.log(`   ${String(f.r).padStart(5)} (min ${f.need}) ${f.size}px  "${f.txt}"`));
  }
  await ctx.close();
}

// --- admin ---
{
  const ctx = await browser.newContext();
  const page = await loginAs(ctx, ADMIN, /admin/);
  for (const path of ['/admin', '/admin/dashboard', '/admin/accounts', '/admin/approvals', '/admin/cards', '/admin/timeline', '/admin/provision']) {
    await page.goto(`https://banca.monivia.it${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const fails = await page.evaluate(audit);
    console.log(`\n### ${path} : ${fails.length} echec(s)`);
    fails.slice(0, 8).forEach((f) => console.log(`   ${String(f.r).padStart(5)} (min ${f.need}) ${f.size}px  "${f.txt}"`));
  }
  await ctx.close();
}

await browser.close();
