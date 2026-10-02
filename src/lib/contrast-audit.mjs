import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("https://banca.monivia.it/login", { waitUntil: "networkidle" });

const audit = async (label) => {
  return await p.evaluate((lbl) => {
    const lum = (r,g,b) => { const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)}; const rat=(a,bg)=>{const L1=lum(...a),L2=lum(...bg);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return ((hi+0.05)/(lo+0.05))};
    const bgOf=(el)=>{let n=el;while(n){const c=getComputedStyle(n).backgroundColor;if(c&&c!=="rgba(0, 0, 0, 0)"&&c!=="transparent"){const m=c.match(/\d+/g).map(Number);return [m[0],m[1],m[2]]}n=n.parentElement}return [255,255,255]};
    const parse=(c)=>{const m=c.match(/\d+/g).map(Number);return [m[0],m[1],m[2]]};
    const out=[];
    document.querySelectorAll("a,button,label,p,span,h1,h2,h3").forEach((el)=>{
      const txt=(el.textContent||"").trim(); if(!txt||txt.length>60) return;
      if(el.querySelector("a,button")) return;
      const cs=getComputedStyle(el);
      const size=parseFloat(cs.fontSize); const bold=parseInt(cs.fontWeight)>=700;
      const r=rat(parse(cs.color), bgOf(el));
      const large=size>=24||(size>=18.66&&bold);
      const need=large?3:4.5;
      if(r<need) out.push({txt:txt.slice(0,42),ratio:r.toFixed(2),need,size:Math.round(size)});
    });
    return {lbl, fails: out.slice(0,6)};
  }, label);
};

const login = await audit("LOGIN");
console.log("=== PAGE LOGIN — echecs de contraste ===");
login.fails.forEach(f => console.log(`  ${String(f.ratio).padStart(5)} (min ${f.need}) ${f.size}px  "${f.txt}"`));
if(!login.fails.length) console.log("  aucun");

await p.fill("#email","markmarco319@gmail.com"); await p.fill("#password","Marco453_34");
await p.getByRole("button",{name:/accedi/i}).click();
await p.waitForURL(/dashboard/,{timeout:30000});
const dash = await audit("DASHBOARD");
console.log("\n=== DASHBOARD CLIENT ===");
dash.fails.forEach(f => console.log(`  ${String(f.ratio).padStart(5)} (min ${f.need}) ${f.size}px  "${f.txt}"`));
if(!dash.fails.length) console.log("  aucun");
await b.close();
