import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("audit/contrast-detail.json", "utf8"));
const keep = d.filter(o => !o.fg.includes("e7000b") && !o.fg.includes("e17100"));
console.log("=== Cas restants, hors familles rouge/ambre ===");
for (const o of keep) {
  console.log(`\n  ${o.path}  ratio=${o.ratio}  ${o.fg} sur ${o.bg}  (${o.size})`);
  console.log(`    sel : ${o.sel}`);
  console.log(`    html: ${o.html}`);
}
