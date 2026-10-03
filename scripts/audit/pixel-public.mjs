import { chromium } from "@playwright/test";

const BASE = "https://banca.monivia.it";
const browser = await chromium.launch();

async function probe(url, label, items) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  console.log(`\n--- ${label} (${url}) ---`);
  for (const [name, fn] of items) {
    const loc = fn(p);
    if (!(await loc.count())) { console.log(`  ${name.padEnd(22)} introuvable`); continue; }
    const box = await loc.boundingBox();
    if (!box) { console.log(`  ${name.padEnd(22)} pas de box`); continue; }
    const png = (
      await p.screenshot({ clip: { x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height) } })
    ).toString("base64");
    const px = await p.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let min = [255, 255, 255], max = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) {
        const q = [d[i], d[i + 1], d[i + 2]];
        if (q[0] + q[1] + q[2] < min[0] + min[1] + min[2]) min = q;
        if (q[0] + q[1] + q[2] > max[0] + max[1] + max[2]) max = q;
      }
      const hex = (a) => "#" + a.map((v) => v.toString(16).padStart(2, "0")).join("");
      const lum = (a) => { const f = a.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const l1 = Math.max(lum(max), lum(min)), l2 = Math.min(lum(max), lum(min));
      return { min: hex(min), max: hex(max), ratio: Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2)) };
    }, png);
    const verdict = px.ratio >= 4.5 ? "OK   " : "ECHEC";
    console.log(`  ${name.padEnd(22)} ${verdict} texte=${px.max} fond=${px.min} ratio=${px.ratio}`);
  }
  await ctx.close();
}

await probe(`${BASE}/`, "Landing publique", [
  ["lien header 1", (p) => p.locator(".gap-1\\.5").first()],
  ["lien header 2", (p) => p.locator(".gap-6.items-center.flex > .gap-1\\.5").nth(1)],
  ["bloc lg:block", (p) => p.locator(".lg\\:block").first()],
]);

const ctx = await browser.newContext();
const p2 = await ctx.newPage();
await p2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await p2.locator("#email").fill("admin@monivia.it");
await p2.locator("#password").fill("fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD");
await p2.getByRole("button", { name: /accedi/i }).click();
await p2.waitForURL(/admin/, { timeout: 30000 });
await p2.waitForTimeout(2500);
console.log("\n--- /admin badge ---");
const b = await p2.locator(".badge").first().boundingBox();
if (b) {
  const png = (await p2.screenshot({ clip: b })).toString("base64");
  const px = await p2.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let min = [255,255,255], max = [0,0,0];
    for (let i=0;i<d.length;i+=4){const q=[d[i],d[i+1],d[i+2]];
      if(q[0]+q[1]+q[2]<min[0]+min[1]+min[2])min=q; if(q[0]+q[1]+q[2]>max[0]+max[1]+max[2])max=q;}
    const hex=a=>"#"+a.map(v=>v.toString(16).padStart(2,"0")).join("");
    const lum=a=>{const f=a.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*f[0]+.7152*f[1]+.0722*f[2];};
    const l1=Math.max(lum(max),lum(min)), l2=Math.min(lum(max),lum(min));
    return {min:hex(min),max:hex(max),ratio:Number(((l1+.05)/(l2+.05)).toFixed(2))};
  }, png);
  console.log(`  badge  ${px.ratio >= 4.5 ? "OK   " : "ECHEC"} texte=${px.max} fond=${px.min} ratio=${px.ratio}`);
  console.log(`  html: ${(await p2.locator(".badge").first().evaluate((e) => e.outerHTML)).slice(0, 140)}`);
}

await browser.close();