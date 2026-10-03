import { chromium } from "@playwright/test";

/**
 * Verifie si les violations "blanc sur fond clair" signalées par axe sont des
 * faux positifs : axe ne sait pas resoudre un background en degrade et remonte
 * jusqu'a l/arriere-plan de la page. On echantillonne les vrais pixels.
 */
const BASE = "https://banca.monivia.it";
const CLIENT = { email: "markmarco319@gmail.com", password: "Marco453_34" };
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.locator("#email").fill(CLIENT.email);
await page.locator("#password").fill(CLIENT.password);
await page.getByRole("button", { name: /accedi/i }).click();
await page.waitForURL(/dashboard/, { timeout: 30000 });
// Le contenu est monte cote client : on attend un element reel avant de mesurer.
await page.getByText("Titolare", { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
await page.waitForTimeout(2500);

const targets = [
  ["Saldo Totale", () => page.getByText("Saldo Totale", { exact: false }).first()],
  ["Titolare", () => page.getByText("Titolare", { exact: false }).first()],
  ["Nom titulaire", () => page.getByText("DI BELLA MARCO", { exact: false }).first()],
  ["Bouton Gestisci", () => page.getByRole("link", { name: "Gestisci" }).first()],
];

for (const [label, fn] of targets) {
  const loc = fn();
  if (!(await loc.count())) { console.log(`  ${label}: introuvable`); continue; }
  const box = await loc.boundingBox();
  if (!box) { console.log(`  ${label}: pas de box`); continue; }

  // Pixel reel au centre du texte, via un canvas dans la page
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height) } });
  const png = shot.toString("base64");
  const px = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    // couleur la plus sombre et la plus claire = texte vs fond
    let min = [255,255,255], max = [0,0,0];
    for (let i = 0; i < d.length; i += 4) {
      const px = [d[i], d[i+1], d[i+2]];
      if (px[0]+px[1]+px[2] < min[0]+min[1]+min[2]) min = px;
      if (px[0]+px[1]+px[2] > max[0]+max[1]+max[2]) max = px;
    }
    const hex = (a) => "#" + a.map(v => v.toString(16).padStart(2,"0")).join("");
    const lum = (a) => {
      const f = a.map(v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
      return 0.2126*f[0] + 0.7152*f[1] + 0.0722*f[2];
    };
    const l1 = Math.max(lum(max), lum(min)), l2 = Math.min(lum(max), lum(min));
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    return { min: hex(min), max: hex(max), ratio: Number(ratio.toFixed(2)) };
  }, png);

  console.log(`  ${label.padEnd(16)} texte=${px.max}  fond=${px.min}  ratio reel=${px.ratio}`);
}

await browser.close();