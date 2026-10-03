import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("audit/crawl.json","utf8"));
const all=[...d.pubRes,...d.clientRes,...d.adminRes];
console.log("\n=== requetes echouees : nature ===");
const byKind={};
for (const r of all) for (const f of (r.failedRequests||[])) {
  const k = f.url.includes("_rsc")||f.url.includes("_next") ? "prefetch/next (annule au reload)" : f.url;
  byKind[k]=(byKind[k]||0)+1;
}
for (const [k,v] of Object.entries(byKind)) console.log(`  ${String(v).padStart(3)} x ${k}`);
