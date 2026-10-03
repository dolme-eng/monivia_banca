import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Crawl live complet. Lecture seule : aucune action destructive.
 * Une seule connexion par role, l'etat de session est reutilise.
 */
const BASE = "https://banca.monivia.it";
const OUT = "audit";
mkdirSync(OUT, { recursive: true });

const CLIENT = { email: "markmarco319@gmail.com", password: "Marco453_34" };
const ADMIN = { email: "admin@monivia.it", password: "fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD" };

const PUBLIC_PAGES = ["/", "/login", "/forgot-password"];
const CLIENT_PAGES = [
  "/dashboard", "/dashboard/cards", "/dashboard/payments",
  "/dashboard/prelievo", "/dashboard/settings", "/dashboard/transactions",
];
const ADMIN_PAGES = [
  "/admin", "/admin/dashboard", "/admin/accounts", "/admin/approvals",
  "/admin/cards", "/admin/timeline", "/admin/provision",
];

const browser = await chromium.launch();

async function login(creds, target) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: /accedi/i }).click();
  await page.waitForURL(target, { timeout: 30000 });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

/** Instrumente une page pour capturer tout ce qui casse. */
function instrument(page, bucket) {
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      bucket.console.push({ type: m.type(), text: m.text().slice(0, 300) });
    }
  });
  page.on("pageerror", (e) => bucket.pageErrors.push(String(e.message).slice(0, 300)));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (u.startsWith(BASE)) bucket.failedRequests.push({ url: u.replace(BASE, ""), err: r.failure()?.errorText });
  });
  page.on("response", async (r) => {
    const u = r.url();
    if (!u.startsWith(BASE)) return;
    const s = r.status();
    if (s >= 400) {
      let body = "";
      try { body = (await r.text()).slice(0, 200); } catch {}
      bucket.badResponses.push({ url: u.replace(BASE, ""), status: s, body });
    }
  });
}

async function auditPages(label, state, paths) {
  const ctx = await browser.newContext({ storageState: state });
  const results = [];

  for (const path of paths) {
    const page = await ctx.newPage();
    const bucket = { console: [], pageErrors: [], failedRequests: [], badResponses: [] };
    instrument(page, bucket);

    const rec = { path, label, ...bucket };

    try {
      const resp = await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
      rec.httpStatus = resp?.status();
      await page.waitForTimeout(3500);
      try { await page.waitForFunction(() => document.querySelector("main")?.innerText?.trim().length > 40, { timeout: 8000 }); } catch {}

      // Rechargement : revele les erreurs d'hydratation et le state lost.
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(3500);
      try { await page.waitForFunction(() => document.querySelector("main")?.innerText?.trim().length > 40, { timeout: 8000 }); } catch {}

      // Structure et contenu
      rec.title = await page.title();
      rec.h1 = await page.locator("h1").allTextContents();
      rec.headings = await page.evaluate(() =>
        [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
          tag: h.tagName, text: (h.textContent || "").trim().slice(0, 60),
        }))
      );
      rec.forms = await page.evaluate(() =>
        [...document.querySelectorAll("form")].map((f) => ({
          action: f.getAttribute("action"),
          controls: [...f.querySelectorAll("input,select,textarea")].map((c) => ({
            tag: c.tagName, type: c.type, id: c.id, name: c.name,
            label: !!c.labels?.length || !!c.getAttribute("aria-label") || !!c.getAttribute("aria-labelledby"),
            placeholderOnly: !c.labels?.length && !c.getAttribute("aria-label") && !!c.placeholder,
          })),
        }))
      );
      rec.unlabeledButtons = await page.evaluate(() =>
        [...document.querySelectorAll("button,a[href]")]
          .filter((b) => {
            const t = (b.textContent || "").trim();
            return !t && !b.getAttribute("aria-label") && !b.getAttribute("title") &&
                   !b.querySelector("[aria-label]") && !b.querySelector("img[alt]:not([alt=''])") &&
                   !b.querySelector("svg[aria-label]");
          })
          .map((b) => (b.className || b.tagName).toString().slice(0, 70))
      );
      rec.imgNoAlt = await page.evaluate(() =>
        [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length
      );
      rec.emptyStates = await page.evaluate(() => {
        const t = document.body.innerText;
        return ["Nessun", "Nessuna", "0 risultati", "Non ci sono", "vuoto", "0 transazioni", "Nessun risultato"]
          .filter((s) => t.includes(s));
      });
      rec.textSample = (await page.locator("body").innerText()).slice(0, 260).replace(/\s+/g, " ");

      const axe = await new AxeBuilder({ page }).analyze();
      rec.a11y = {
        violations: axe.violations.map((v) => ({
          id: v.id, impact: v.impact, n: v.nodes.length,
          help: v.help.slice(0, 90),
          samples: v.nodes.slice(0, 3).map((n) => n.target[0]),
        })),
        passesCount: axe.passes.length,
      };
    } catch (e) {
      rec.fatal = String(e.message).slice(0, 250);
    }

    results.push(rec);
    const n = (a) => (a?.length ?? 0);
    console.log(
      `${label.padEnd(6)} ${path.padEnd(26)} http=${rec.httpStatus ?? "-"} ` +
      `console=${n(rec.console)} pageErr=${n(rec.pageErrors)} bad=${n(rec.badResponses)} ` +
      `failed=${n(rec.failedRequests)} a11y=${rec.a11y?.violations.length ?? "-"}` +
      (rec.fatal ? `  FATAL=${rec.fatal}` : "")
    );
    await page.close();
  }

  await ctx.close();
  return results;
}

const anonCtx = await browser.newContext();
const anonPage = await anonCtx.newPage();
const anonBucket = { console: [], pageErrors: [], failedRequests: [], badResponses: [] };
instrument(anonPage, anonBucket);
const anon = [];
for (const p of PUBLIC_PAGES) {
  const r = await anonPage.goto(BASE + p, { waitUntil: "load", timeout: 45000 });
  anon.push({ path: p, httpStatus: r?.status(), title: await anonPage.title() });
  console.log(`ANON   ${p.padEnd(26)} http=${r?.status()}`);
}
await anonCtx.close();

console.log("\nConnexion client...");
const clientState = await login(CLIENT, /dashboard/);
console.log("Connexion admin...");
const adminState = await login(ADMIN, /admin/);

const clientRes = await auditPages("CLIENT", clientState, CLIENT_PAGES);
const adminRes = await auditPages("ADMIN", adminState, ADMIN_PAGES);
const pubRes = await auditPages("ANON", { cookies: [] }, PUBLIC_PAGES);

writeFileSync(`${OUT}/crawl.json`, JSON.stringify({ anon, pubRes, clientRes, adminRes }, null, 2));
console.log(`\nEcrit : ${OUT}/crawl.json`);
await browser.close();