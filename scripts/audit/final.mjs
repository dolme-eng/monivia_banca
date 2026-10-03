import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("audit/crawl.json","utf8"));
const all=[...d.pubRes,...d.clientRes,...d.adminRes];
console.log("\n=== ERREURS CONSOLE / REPONSES >=400 ===");
for (const r of all) {
  for (const c of (r.console||[])) console.log(`  ${r.path} [${c.type}] ${c.text}`);
  for (const b of (r.badResponses||[])) console.log(`  ${r.path} HTTP ${b.status} ${b.url} ${String(b.body).slice(0,140)}`);
  for (const e of (r.pageErrors||[])) console.log(`  ${r.path} PAGEERROR ${e}`);
}
console.log("\n=== A11Y restants ===");
let tot=0;
for (const r of all) for (const v of (r.a11y?.violations||[])) { tot+=v.n; console.log(`  [${v.impact}] ${r.path} ${v.id} x${v.n}`); }
console.log(`\nTotal violations a11y restantes: ${tot}`);
