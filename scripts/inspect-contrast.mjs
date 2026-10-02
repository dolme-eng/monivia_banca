import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto("https://banca.monivia.it/login", { waitUntil: "networkidle" });
await p.locator("#email").fill("admin@monivia.it");
await p.locator("#password").fill("fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD");
await p.getByRole("button",{name:/accedi/i}).click();
await p.waitForURL(/admin/, { timeout: 30000 });
await p.goto("https://banca.monivia.it/admin/approvals", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
const info = await p.evaluate(() => {
  const cv = document.createElement("canvas"); cv.width=cv.height=1;
  const c2 = cv.getContext("2d",{willReadFrequently:true});
  const parse=(c)=>{c2.clearRect(0,0,1,1);c2.fillStyle="#000";c2.fillStyle=c;c2.fillRect(0,0,1,1);const d=c2.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]];};
  const hex=(r)=>"rgb("+r.join(",")+")";
  const chain=(el)=>{let n=el,out=[];while(n&&out.length<6){const bg=getComputedStyle(n).backgroundColor;if(bg&&bg!=="rgba(0, 0, 0, 0)")out.push(`${n.tagName}.${(n.className||"").toString().slice(0,28)} => ${bg}`);n=n.parentElement;}return out;};
  const res=[];
  const targets=["In Attesa","Panoramica","MONIVIA"];
  document.querySelectorAll("*").forEach(el=>{
    const t=(el.textContent||"").trim();
    if(t.length>0&&t.length<24&&targets.some(x=>t===x||t.includes(x))&&el.children.length===0){
      const cs=getComputedStyle(el);
      res.push({text:t, color:cs.color, size:cs.fontSize, chain:chain(el)});
    }
  });
  return res.slice(0,4);
});
info.forEach(i=>{console.log(`\n "${i.text}" ${i.size} color=${i.color}`);i.chain.forEach(c=>console.log("    "+c));});
await b.close();
