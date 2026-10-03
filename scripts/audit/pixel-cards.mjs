import { chromium } from "@playwright/test";
const b = await chromium.launch(); const c = await b.newContext(); const p = await c.newPage();
await p.goto("https://banca.monivia.it/login", { waitUntil: "networkidle" });
await p.locator("#email").fill("markmarco319@gmail.com");
await p.locator("#password").fill("Marco453_34");
await p.getByRole("button", { name: /accedi/i }).click();
await p.waitForURL(/dashboard/, { timeout: 30000 });
await p.goto("https://banca.monivia.it/dashboard/cards", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
const t = (l) => p.getByText(l, { exact: false }).first();
const targets = [["Scade", () => t("Scade")], ["Badge .h-6", () => p.locator(".h-6").first()]];
for (const [label, fn] of targets) {
  const loc = fn();
  if (!(await loc.count())) { console.log(`  ${label}: introuvable`); continue; }
  const box = await loc.boundingBox();
  if (!box) { console.log(`  ${label}: pas de box`); continue; }
  const png = (await p.screenshot({ clip: { x: box.x, y: box.y, width: Math.max(1,box.width), height: Math.max(1,box.height) } })).toString("base64");
  const px = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext("2d"); g.drawImage(img,0,0);
    const d = g.getImageData(0,0,cv.width,cv.height).data;
    let min=[255,255,255], max=[0,0,0];
    for (let i=0;i<d.length;i+=4){const q=[d[i],d[i+1],d[i+2]];
      if(q[0]+q[1]+q[2]<min[0]+min[1]+min[2])min=q; if(q[0]+q[1]+q[2]>max[0]+max[1]+max[2])max=q;}
    const hex=a=>"#"+a.map(v=>v.toString(16).padStart(2,"0")).join("");
    const lum=a=>{const f=a.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*f[0]+.7152*f[1]+.0722*f[2];};
    const l1=Math.max(lum(max),lum(min)), l2=Math.min(lum(max),lum(min));
    return {min:hex(min),max:hex(max),ratio:Number(((l1+.05)/(l2+.05)).toFixed(2))};
  }, png);
  console.log(`  ${label.padEnd(14)} texte=${px.max} fond=${px.min} ratio reel=${px.ratio}`);
}
await b.close();
