import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";

/**
 * Pour chaque violation color-contrast d'axe, echantillonne les pixels reels
 * du rendu. Sert a separer les vrais echecs des faux positifs quand l'element
 * repose sur un fond en degrade (que axe ne sait pas resoudre).
 */
const BASE = "https://banca.monivia.it";
const CLIENT = { email: "markmarco319@gmail.com", password: "Marco453_34" };
const ADMIN = { email: "admin@monivia.it", password: "fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD" };

const browser = await chromium.launch();

async function state(creds, target) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
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

const GROUPS = [
  ["ANON", null, ["/"]],
  ["CLIENT", clientState, ["/dashboard", "/dashboard/cards", "/dashboard/settings", "/dashboard/prelievo"]],
  ["ADMIN", adminState, ["/admin"]],
];

const real = [];
const falsePos = [];

for (const [label, st, paths] of GROUPS) {
  const ctx = await browser.newContext(st ? { storageState: st } : {});
  for (const path of paths) {
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(3000);
    try {
      await page.waitForFunction(() => document.querySelector("main")?.innerText?.trim().length > 40, { timeout: 8000 });
    } catch {}

    const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    const nodes = r.violations[0]?.nodes ?? [];
    if (!nodes.length) { console.log(`${path}: 0 violation`); await page.close(); continue; }

    console.log(`\n##### ${path} — ${nodes.length} signalement(s) axe`);
    for (const n of nodes) {
      const msg = n.any[0]?.message || "";
      const axeRatio = Number(msg.match(/contrast of ([\d.]+)/)?.[1] ?? 0);
      const axeFg = msg.match(/foreground color: ([^,]+)/)?.[1];
      const axeBg = msg.match(/background color: ([^,]+)/)?.[1];
      const size = msg.match(/font size: ([^(]+)/)?.[1]?.trim();
      const sel = String(n.target[0]);

      // bounding box via le selecteur axe
      let box = null;
      try {
        const loc = page.locator(sel).first();
        if (await loc.count()) {
          await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
          await page.waitForTimeout(250);
          box = await loc.boundingBox();
        }
      } catch {}

      if (!box || box.width < 1 || box.height < 1) {
        console.log(`  [INCONCLUANT] ${sel.slice(0, 50)} (pas de box)`);
        continue;
      }

      const png = (
        await page.screenshot({
          clip: {
            x: Math.max(0, box.x), y: Math.max(0, box.y),
            width: Math.min(box.width, 400), height: Math.min(box.height, 60),
          },
        })
      ).toString("base64");

      const px = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
        const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        // On ne garde que les pixels assez opaques pour eviter le flou anti-aliase.
        let min = [255, 255, 255], max = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue;
          const q = [d[i], d[i + 1], d[i + 2]];
          if (q[0] + q[1] + q[2] < min[0] + min[1] + min[2]) min = q;
          if (q[0] + q[1] + q[2] > max[0] + max[1] + max[2]) max = q;
        }
        const hex = (a) => "#" + a.map((v) => v.toString(16).padStart(2, "0")).join("");
        const lum = (a) => { const f = a.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
        const l1 = Math.max(lum(max), lum(min)), l2 = Math.min(lum(max), lum(min));
        return { clair: hex(max), sombre: hex(min), ratio: Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2)) };
      }, png);

      const seuil = /14px|18px|24px|bold/.test(size || "") ? 3 : 4.5;
      const ok = px.ratio >= seuil;
      const rec = { path, sel: sel.slice(0, 90), size, axeRatio, axeFg, axeBg, reel: px.ratio, seuil, verdict: ok ? "OK" : "ECHEC" };
      (ok ? falsePos : real).push(rec);
      console.log(
        `  ${ok ? "OK   " : "ECHEC"} axe=${String(axeRatio).padEnd(5)} reel=${String(px.ratio).padEnd(5)} ` +
        `seuil=${seuil} ${px.clair}/${px.sombre}  ${sel.slice(0, 46)}`
      );
    }
    await page.close();
  }
  await ctx.close();
}

console.log(`\n\n===== BILAN =====`);
console.log(`  Faux positifs d'axe (contraste reel conforme) : ${falsePos.length}`);
console.log(`  Echecs REELS a corriger                        : ${real.length}`);
for (const r of real) console.log(`    ${r.path}  reel=${r.reel} (< ${r.seuil})  ${r.sel}`);

writeFileSync("audit/contrast-verified.json", JSON.stringify({ real, falsePos }, null, 2));
await browser.close();