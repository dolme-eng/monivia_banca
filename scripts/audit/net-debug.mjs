import { chromium } from "@playwright/test";

const b = await chromium.launch();
const c = await b.newContext();
const p = await c.newPage();
const log = [];
p.on("response", (r) => {
  const u = r.url();
  if (u.includes("banca.monivia.it/api")) log.push(`${r.status()} ${u.replace("https://banca.monivia.it", "")}`);
});
p.on("console", (m) => log.push(`CONSOLE[${m.type()}] ${m.text().slice(0, 200)}`));
p.on("pageerror", (e) => log.push(`PAGEERROR ${e.message.slice(0, 200)}`));

await p.goto("https://bancia.monivia.it/login".replace("bancia", "banca"), { waitUntil: "networkidle" });
await p.locator("#email").fill("markmarco319@gmail.com");
await p.locator("#password").fill("Marco453_34");
await p.getByRole("button", { name: /accedi/i }).click();
await p.waitForURL(/dashboard/, { timeout: 30000 });
await p.waitForTimeout(5000);

console.log("--- reseau + console ---");
log.forEach((l) => console.log("  " + l));
const main = await p.locator("main").count();
console.log(`--- <main> present: ${main}`);
if (main) console.log("--- main (400): " + (await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 400));
console.log("--- spinners: " + (await p.locator(".animate-spin").count()));
await b.close();