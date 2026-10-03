import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, "src", "app");

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(e)) continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

// --- Pages ---
const pages = [];
for (const f of walk(APP)) {
  const rel = relative(APP, f).replace(/\\/g, "/");
  if (!rel.endsWith("/page.tsx")) continue;
  const segs = rel.split("/");
  if (segs.includes("api")) continue;
  const route =
    "/" +
    segs
      .slice(0, -1)
      .map((s) =>
        s.startsWith("(") && s.endsWith(")") ? null : s.startsWith("[") ? `:${s}` : s
      )
      .filter(Boolean)
      .join("/");
  pages.push({
    route: route.replace(/\/+$/, "") || "/",
    group: segs.find((s) => s.startsWith("(")) ?? "-",
    file: rel,
    src: readFileSync(f, "utf8"),
  });
}

// --- Endpoints API ---
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const routes = [];
for (const f of walk(APP)) {
  const rel = relative(APP, f).replace(/\\/g, "/");
  if (!/\/route\.(ts|js)$/.test(rel)) continue;
  const segs = rel.split("/").slice(1, -1);
  const route =
    "/api/" +
    segs
      .map((s) =>
        s.startsWith("(") && s.endsWith(")") ? null : s.startsWith("[") ? `:${s}` : s
      )
      .filter(Boolean)
      .join("/");
  const src = readFileSync(f, "utf8");
  const methods = METHODS.filter((m) =>
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\b`).test(src)
  );
  routes.push({
    route,
    methods,
    file: rel,
    src,
    lines: src.split("\n").length,
    //_indices d'auth
    hasSession: /getSession|requireAuth|session|cookies\(\)|verifyToken|getServerSession/i.test(src),
    hasRoleCheck: /role\s*===|role\s*!==|isAdmin|requireAdmin|ADMIN/i.test(src),
    hasRateLimit: /rateLimit|checkRateLimit|RateLimitEntry/i.test(src),
    hasZod: /z\.object|safeParse|zod/i.test(src),
    hasTryCatch: /try\s*\{/.test(src),
    hasCSRF: /csrf/i.test(src),
    dynamic: /await\s+params|await\s+request\.json\(\)/.test(src),
  });
}

const report = { pages, routes };
writeFileSafe(join(ROOT, "audit", "inventory.json"), JSON.stringify(report, null, 2));

// --- Résumé console ---
console.log(`PAGES : ${pages.length}`);
const byGroup = {};
for (const p of pages) (byGroup[p.group] ??= []).push(p.route);
for (const [g, rs] of Object.entries(byGroup)) {
  console.log(`\n  [${g}] ${rs.length}`);
  for (const r of rs.sort()) console.log(`    ${r}`);
}

console.log(`\n\nENDPOINTS API : ${routes.length}`);
for (const r of routes.sort((a, b) => a.route.localeCompare(b.route))) {
  const flags = [];
  if (!r.hasSession) flags.push("!! pas de session");
  if (r.hasRoleCheck) flags.push("role");
  if (r.hasRateLimit) flags.push("rateLimit");
  if (r.hasZod) flags.push("zod");
  if (!r.hasTryCatch) flags.push("!! pas de try/catch");
  console.log(`  ${r.methods.join(",").padEnd(14)} ${r.route.padEnd(48)} ${flags.join(" ")}`);
}

const noAuth = routes.filter((r) => !r.hasSession && r.methods.some((m) => ["POST", "PUT", "PATCH", "DELETE"].includes(m)));
console.log(`\n\n!! Endpoints mutateurs SANS indice de session : ${noAuth.length}`);
for (const r of noAuth) console.log(`   ${r.methods.join(",")} ${r.route}`);

const noCatch = routes.filter((r) => !r.hasTryCatch && r.dynamic);
console.log(`\n!! Endpoints dynamiques SANS try/catch : ${noCatch.length}`);
for (const r of noCatch) console.log(`   ${r.methods.join(",")} ${r.route}`);

function writeFileSafe(p, c) {
  mkdirSync(join(ROOT, "audit"), { recursive: true });
  writeFileSync(p, c, "utf8");
}