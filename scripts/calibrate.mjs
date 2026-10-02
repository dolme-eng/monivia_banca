import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("https://banca.monivia.it/login", { waitUntil: "networkidle" });
const out = await p.evaluate(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const parse = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle="#000"; ctx.fillStyle=c; ctx.fillRect(0,0,1,1); const d=ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; };
  const lum=(r,g,b)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
  const ratio=(f,bg)=>{const l1=lum(...f),l2=lum(...bg);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05)};
  // known reference pairs
  const cases = [
    ["#94a3b8 sur blanc (attendu 2.56)", "#94a3b8", [255,255,255]],
    ["#64748b sur blanc (attendu 4.76)", "#64748b", [255,255,255]],
    ["#00d4ff sur blanc (attendu 1.76)", "#00d4ff", [255,255,255]],
    ["#ffffff sur #0a1628 (attendu 17)", "#ffffff", [10,22,40]],
    ["#046b86 sur blanc (attendu 4.9)", "#046b86", [255,255,255]],
  ];
  return cases.map(([label, fg, bg]) => {
    const f = parse(fg);
    return `${label} => calcule ${ratio([f[0],f[1],f[2]], bg).toFixed(2)}  (rgb lu: ${f[0]},${f[1]},${f[2]})`;
  });
});
out.forEach(l => console.log("  " + l));
// verifie ce que le navigateur renvoie reellement pour une classe Tailwind
const real = await p.evaluate(() => {
  const d = document.createElement("div");
  d.className = "text-slate-400";
  document.body.appendChild(d);
  const c = getComputedStyle(d).color;
  d.remove();
  return c;
});
console.log("\n  getComputedStyle(text-slate-400) renvoie : " + real);
await b.close();
