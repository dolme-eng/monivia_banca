import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("audit/crawl.json","utf8"));
const all=[...d.pubRes,...d.clientRes,...d.adminRes];
console.log("=== ETAT VIDE : texte reel de la page ===");
for (const r of all) if (r.emptyStates?.length) console.log(`\n  ${r.path}:\n    ${(r.textSample||"").slice(0,220)}`);
console.log("\n\n=== PAGES SANS H1 ===");
for (const r of all) if (!r.h1?.length) console.log(`  ${r.path}  (h1=${JSON.stringify(r.h1)})`);
console.log("\n=== H1 presents ===");
for (const r of all) if (r.h1?.length) console.log(`  ${r.path}  -> ${JSON.stringify(r.h1)}`);
