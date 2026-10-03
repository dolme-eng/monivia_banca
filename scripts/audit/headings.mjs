import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("audit/crawl.json","utf8"));
const all=[...d.pubRes,...d.clientRes,...d.adminRes];
for (const r of all) {
  const bad = (r.a11y?.violations||[]).some(v=>v.id==="heading-order");
  if (!bad) continue;
  console.log(`\n=== ${r.path} ===`);
  let prev = 0;
  for (const h of r.headings || []) {
    const lvl = Number(h.tag.replace("H",""));
    const jump = prev && lvl > prev + 1 ? `   <<< SAUT ${prev}->${lvl}` : "";
    console.log(`  ${h.tag}  ${h.text}${jump}`);
    prev = lvl;
  }
}
