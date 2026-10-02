import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto("https://banca.monivia.it/login", { waitUntil: "networkidle" });
await p.locator("#email").fill("markmarco319@gmail.com");
await p.locator("#password").fill("Marco453_34");
await p.getByRole("button",{name:/accedi/i}).click();
await p.waitForURL(/dashboard/, { timeout: 30000 });
await p.waitForTimeout(1500);
const raw = await p.evaluate(() => {
  const links = [...document.querySelectorAll("a")].filter(a => (a.textContent||"").trim() === "Carte");
  return links.slice(0,2).map(a => {
    let n=a, chain=[];
    while(n && chain.length<5){ chain.push(`${n.tagName} bg="${getComputedStyle(n).backgroundColor}"`); n=n.parentElement; }
    return { color: getComputedStyle(a).color, chain };
  });
});
raw.forEach((r,i)=>{ console.log(`\n--- occurrence ${i+1} ---`); console.log("  color    =", r.color); r.chain.forEach(c=>console.log("   "+c)); });
await b.close();
