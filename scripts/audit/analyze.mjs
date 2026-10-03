import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("audit/crawl.json", "utf8"));
const all = [...d.pubRes, ...d.clientRes, ...d.adminRes];

console.log("=== REQUETES EN ECHEC ===");
for (const r of all) for (const f of (r.failedRequests || [])) console.log(`  ${r.path}  ${f.url}  ${f.err}`);

console.log("\n=== REPONSES >= 400 ===");
for (const r of all) for (const b of (r.badResponses || [])) console.log(`  ${r.path}  ${b.status}  ${b.url}  ${b.body.slice(0,120)}`);

console.log("\n=== ERREURS PAGE / CONSOLE ===");
for (const r of all) {
  for (const e of (r.pageErrors || [])) console.log(`  PAGEERR ${r.path}: ${e}`);
  for (const c of (r.console || [])) console.log(`  CONSOLE ${r.path} [${c.type}]: ${c.text}`);
}

console.log("\n=== A11Y : violations par page ===");
for (const r of all) for (const v of (r.a11y?.violations || [])) {
  console.log(`  [${v.impact}] ${r.path}  ${v.id} x${v.n}  ${v.help}`);
  for (const s of v.samples) console.log(`        ${String(s).slice(0,80)}`);
}

console.log("\n=== CHAMPS DE FORMULAIRE SANS LABEL ===");
for (const r of all) for (const f of (r.forms || [])) for (const c of f.controls) {
  if (!c.label) console.log(`  ${r.path}  <${c.tag} type=${c.type} id=${c.id||"-"} name=${c.name||"-"}> placeholderSeul=${c.placeholderOnly}`);
}

console.log("\n=== BOUTONS/LIENS SANS NOM ACCESSIBLE ===");
for (const r of all) for (const b of (r.unlabeledButtons || [])) console.log(`  ${r.path}  ${b}`);

console.log("\n=== ETATS VIDES DETECTES ===");
for (const r of all) if ((r.emptyStates||[]).length) console.log(`  ${r.path}: ${r.emptyStates.join(", ")}`);
