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
  // Two different colour spaces, easily conflated:
  //  - CSS lab():  L is 0..100, needs the CIE XYZ path.
  //  - oklab():    L is 0..1,   needs the direct OKLab matrices.
  // Getting this wrong silently reports background-coloured text as failing.
  const gamma = (v) => {
    v = v > 0.0031308 ? 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055 : 12.92 * v;
    return Math.min(255, Math.max(0, Math.round(v * 255)));
  };
  const xyzToRgb = (L, a, b) => {
    const fwd = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const l = (L + 16) / 116, m = l + a / 500, s = l - b / 200;
    // Inverse of fwd: cubic above the knee, LINEAR below it. Using l**3
    // everywhere washes dark colours out and was the source of the bogus
    // readings.
    const inv = (t) => (t > 6 / 29 ? t ** 3 : 3 * (6 / 29) ** 2 * (t - 4 / 29));
    const X = 0.9504559271 * inv(l);
    const Y = 1.0 * inv(m);
    const Z = 1.0890577508 * inv(s);
    const fx = fwd(X / 0.9504559271), fy = fwd(Y), fz = fwd(Z / 1.0890577508);
    return [gamma(3.2404542 * fx - 1.5371385 * fy - 0.4985314 * fz),
            gamma(-0.9692660 * fx + 1.8760108 * fy + 0.0415560 * fz),
            gamma(0.0556434 * fx - 0.2040259 * fy + 1.0572252 * fz)];
  };
  const oklabToRgb = (L, a, b) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    return [gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            gamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
  };
  const oklchToRgb = (L, C, Hdeg) => {
    const h = (Hdeg * Math.PI) / 180;
    return oklabToRgb(L, C * Math.cos(h), C * Math.sin(h));
  };
  const parseAny = (c) => {
    if (!c) return null;
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
    }
    m = c.match(/^lab\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean);
      return { rgb: xyzToRgb(+p[0] / 100, +p[1], +p[2]), a: p.length > 3 ? +p[3] : 1 };
    }
    m = c.match(/^oklab\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean);
      return { rgb: oklabToRgb(+p[0], +p[1], +p[2]), a: p.length > 3 ? +p[3] : 1 };
    }
    m = c.match(/^oklch\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean);
      return { rgb: oklchToRgb(+p[0], +p[1], +p[2]), a: p.length > 3 ? +p[3] : 1 };
    }
    if (c === 'transparent') return { rgb: [0, 0, 0], a: 0 };
    return null;
  };
  const over = (fg, bg, alpha) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));

  const bgOf = (el) => {
    let n = el;
    let acc = null;
    while (n && n !== document.documentElement) {
      const p = parseAny(getComputedStyle(n).backgroundColor);
      if (p && p.a > 0) {
        acc = acc === null ? (p.a === 1 ? p.rgb : over(p.rgb, [255, 255, 255], p.a))
                           : over(p.rgb, acc, p.a);
        if (p.a === 1) break;
      }
      n = n.parentElement;
    }
    return acc || [255, 255, 255];
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
    const bg = bgOf(el);
    const fgp = parseAny(cs.color);
    if (!fgp) return;
    if (fgp.a < 0.15) return; // effectively invisible
    const fg = over(fgp.rgb, bg, fgp.a); // composite the text onto its real backdrop
    const r = ratio(fg, bg);
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
