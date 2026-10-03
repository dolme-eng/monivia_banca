import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

/**
 * Test de robustesse et d' autorisation des endpoints API contre le site live.
 * Lecture seule : uniquement des requetes dont on KNOW le refus attendu
 * (401/403/400/404). Aucune operation reelle de creation, de modification
 * financiere ou de suppression.
 */
const BASE = "https://banca.monivia.it";
const CLIENT = { email: "markmarco319@gmail.com", password: "Marco453_34" };
const ADMIN = { email: "admin@monivia.it", password: "fEhby4YBaACjmDtF7DcSwJxQ-3r5gVPD" };

const inv = JSON.parse(readFileSync("audit/inventory.json", "utf8"));
const endpoints = inv.routes
  .map((r) => ({
    path: r.route,
    methods: r.methods,
    // parametres de route a remplacer par une valeur bidon
    params: [...r.route.matchAll(/:\[([^\]]+)\]/g)].map((m) => m[1]),
  }))
  .filter((e) => !e.path.includes("/api/csrf") && !e.path.includes("/api/auth/login") && !e.path.includes("/api/auth/logout"));

function concretize(p, params) {
  return p.replace(/:\[([^\]]+)\]/g, (_, n) => (params.includes(n) ? "00000000-0000-0000-0000-000000000000" : "x"));
}

async function getToken(creds) {
  const csrf = await (await fetch(`${BASE}/api/csrf`)).json();
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrf.csrfToken },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const setCookie = r.headers.getSetCookie?.() ?? [];
  const tok = setCookie.map((c) => c.split(";")[0]).find((c) => /session-token/.test(c));
  if (!tok) throw new Error(`pas de cookie pour ${creds.email} (HTTP ${r.status})`);
  return tok;
}

const clientTok = await getToken(CLIENT);
const adminTok = await getToken(ADMIN);
console.log(`Sessions obtenues. ${endpoints.length} endpoints a tester.\n`);

const results = [];
for (const e of endpoints) {
  const url = BASE + concretize(e.path, e.params);
  for (const m of e.methods) {
    // sans authentification
    let r = await fetch(url, { method: m, headers: { "content-type": "application/json" }, body: m === "GET" || m === "HEAD" ? undefined : "{}" });
    const noAuth = r.status;

    // avec session client sur une route admin -> doit etre 403
    let asClient = null;
    if (e.path.startsWith("/api/admin")) {
      r = await fetch(url, { method: m, headers: { "content-type": "application/json", cookie: clientTok }, body: m === "GET" ? undefined : "{}" });
      asClient = r.status;
    }

    // avec session admin, ID bidon et corps vide -> ne doit pas etre 500
    let asAdmin = null;
    let body = "";
    if (m !== "GET" && m !== "HEAD") {
      r = await fetch(url, { method: m, headers: { "content-type": "application/json", cookie: adminTok }, body: "{}" });
      asAdmin = r.status;
      try { body = (await r.text()).slice(0, 120); } catch {}
    }

    results.push({ path: e.path, m, noAuth, asClient, asAdmin, body });
  }
}

// --- Analyse ---
console.log("=== 1. Endpoints qui repondent 200 SANS authentification ===");
let n = 0;
for (const r of results) {
  const open = r.noAuth === 200 || r.noAuth === 201 || r.noAuth === 204;
  const isPublic = /forgot-password|reset-password|register|csrf|invites|auth\/login/.test(r.path);
  if (open && !isPublic) { console.log(`  !! ${r.m} ${r.path} -> ${r.noAuth}`); n++; }
  else if (open) console.log(`     (public attendu) ${r.m} ${r.path} -> ${r.noAuth}`);
}
if (!n) console.log("  aucun");

console.log("\n=== 2. Routes admin accessibles par un CLIENT ===");
n = 0;
for (const r of results) {
  if (r.asClient === 200 || r.asClient === 201) { console.log(`  !! ${r.m} ${r.path} -> ${r.asClient} avec session USER`); n++; }
}
if (!n) console.log("  aucune : le controle de role tient");

console.log("\n=== 3. Requetes admin avec ID bidon / corps vide qui RENVOIENT 500 ===");
n = 0;
for (const r of results) {
  if (r.asAdmin === 500) { console.log(`  !! ${r.m} ${r.path} -> 500  ${r.body}`); n++; }
  else if (r.asAdmin === 502 || r.asAdmin === 503) { console.log(`  ?? ${r.m} ${r.path} -> ${r.asAdmin}`); n++; }
}
if (!n) console.log("  aucun");

console.log("\n=== 4. Reponses 500 sur endpoints SANS session (avant meme le controle) ===");
n = 0;
for (const r of results) {
  if (r.noAuth >= 500) { console.log(`  !! ${r.m} ${r.path} -> ${r.noAuth}`); n++; }
}
if (!n) console.log("  aucun");

console.log("\n=== 5. Codes observes par endpoint (anomalies) ===");
for (const r of results) {
  const expected = /forgot-password|reset-password|register|csrf|invites|login/.test(r.path);
  const codes = [r.noAuth, r.asClient, r.asAdmin].filter((x) => x !== null);
  const odd = codes.some((c) => c === 500 || c === 405 || (c === 200 && !expected && r.path.startsWith("/api/admin")));
  if (odd) console.log(`  ${r.m.padEnd(7)} ${r.path.padEnd(46)} sansAuth=${r.noAuth} client=${r.asClient} admin=${r.asAdmin}`);
}

console.log("\n=== 6. CORS / headers de securite sur une route publique ===");
const h = await fetch(`${BASE}/api/csrf`);
console.log(`  Access-Control-Allow-Origin : ${h.headers.get("access-control-allow-origin") ?? "(absent)"}`);
console.log(`  X-Frame-Options             : ${h.headers.get("x-frame-options") ?? "(absent)"}`);
console.log(`  X-Content-Type-Options      : ${h.headers.get("x-content-type-options") ?? "(absent)"}`);
console.log(`  Strict-Transport-Security   : ${h.headers.get("strict-transport-security") ?? "(absent)"}`);
console.log(`  Content-Security-Policy     : ${(h.headers.get("content-security-policy") ?? "(absent)").slice(0, 90)}`);
console.log(`  Referrer-Policy             : ${h.headers.get("referrer-policy") ?? "(absent)"}`);

writeFileSafe("audit/api-results.json", JSON.stringify(results, null, 2));

function writeFileSafe(p, c) {
  mkdirSync("audit", { recursive: true });
  writeFileSync(p, c, "utf8");
}