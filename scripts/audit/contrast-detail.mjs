import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://banca.monivia.it";
const CLIENT = { email: "markmarco319@gmail.com", password: "Marco453_34" };
const ADMIN = { email: "admin@monivia.it", password: "fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD" };

const browser = await chromium.launch();

async function state(creds, target) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.locator("#email").fill(creds.email);
  await p.locator("#password").fill(creds.password);
  await p.getByRole("button", { name: /accedi/i }).click();
  await p.waitForURL(target, { timeout: 30000 });
  const s = await ctx.storageState();
  await ctx.close();
  return s;
}

const clientState = await state(CLIENT, /dashboard/);
const adminState = await state(ADMIN, /admin/);

const TARGETS = [
  ["CLIENT", clientState, ["/dashboard", "/dashboard/cards", "/dashboard/transactions"]],
  ["ADMIN", adminState, ["/admin/dashboard", "/admin/accounts", "/admin/cards"]],
];

const out = [];
for (const [label, st, paths] of TARGETS) {
  const ctx = await browser.newContext({ storageState: st });
  for (const path of paths) {
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    console.log(`\n##### ${path} — ${r.violations[0]?.nodes.length ?? 0} echecs`);
    for (const n of r.violations[0]?.nodes ?? []) {
      const msg = n.any[0]?.message || "";
      const ratio = msg.match(/contrast of ([\d.]+)/)?.[1];
      const fg = msg.match(/foreground color: ([^,]+)/)?.[1];
      const bg = msg.match(/background color: ([^,]+)/)?.[1];
      const size = msg.match(/font size: ([^(]+)/)?.[1]?.trim();
      const sel = String(n.target[0]).replace(/\\+/g, "").slice(0, 72);
      const html = String(n.html).replace(/\s+/g, " ").slice(0, 100);
      console.log(`  ratio=${String(ratio).padEnd(5)} ${fg} sur ${bg}  (${size})`);
      console.log(`     ${sel}`);
      console.log(`     ${html}`);
      out.push({ path, ratio: Number(ratio), fg, bg, size, sel, html });
    }
    await page.close();
  }
  await ctx.close();
}

// Regroupement par couple couleur -> combien d'occurrences
const byPair = new Map();
for (const o of out) {
  const k = `${o.fg} sur ${o.bg} = ${o.ratio} (${o.size})`;
  byPair.set(k, (byPair.get(k) || 0) + 1);
}
console.log("\n\n===== PAR COULEUR (par ordre d'importance) =====");
[...byPair.entries()].sort((a, b) => a[1] - b[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)} x  ${k}`));

writeFileSync("audit/contrast-detail.json", JSON.stringify(out, null, 2));
await browser.close();