import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Connexion directe (DIRECT_URL, port 5432) : le pooler 6543 est en mode
// transaction et ne permet pas les lectures sur _prisma_migrations.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const MIGRATIONS_DIR = "prisma/migrations";

// --- 1. Etat reel de _prisma_migrations -------------------------------------
const rows = await prisma.$queryRawUnsafe(`
  SELECT migration_name, checksum, finished_at, applied_steps_count, rolled_back_at
  FROM "_prisma_migrations"
  ORDER BY started_at
`);

console.log("=== _prisma_migrations ===");
for (const r of rows) {
  const c = r.checksum ?? "";
  const tag = c === "baselined-by-hand" ? "MANUEL" : c ? "cli" : "NULL";
  console.log(
    `  ${r.migration_name.padEnd(42)} ${tag.padEnd(7)} finished=${r.finished_at ? "oui" : "NON"} steps=${r.applied_steps_count} rollback=${r.rolled_back_at ?? "-"}`
  );
}

// --- 2. Checksum reel de chaque migration.sql sur disque ---------------------
const folders = readdirSync(MIGRATIONS_DIR).filter((d) =>
  existsSync(join(MIGRATIONS_DIR, d, "migration.sql"))
);
const onDisk = new Map();
for (const f of folders) {
  const buf = readFileSync(join(MIGRATIONS_DIR, f, "migration.sql"));
  onDisk.set(f, {
    sha: createHash("sha256").update(buf).digest("hex"),
    crlf: buf.includes("\r\n") ? "CRLF" : "LF",
  });
}

console.log("\n=== Verification des checksums ===");
const byName = new Map(rows.map((r) => [r.migration_name, r]));
const mismatch = [];
for (const [name, disk] of onDisk) {
  const row = byName.get(name);
  if (!row) {
    console.log(`  ABSENT EN BASE  ${name}`);
    continue;
  }
  const db = row.checksum ?? "";
  const ok = db === disk.sha;
  if (!ok) mismatch.push({ name, db, disk: disk.sha });
  console.log(
    `  ${ok ? "OK   " : "BAD  "} ${name.padEnd(42)} disque=${disk.sha.slice(0, 12)}.. base=${db.slice(0, 12)}.. ${disk.crlf}`
  );
}
for (const [name] of onDisk) {
  if (!byName.has(name)) continue;
}

const ghosts = rows.filter((r) => !onDisk.has(r.migration_name));
for (const g of ghosts) console.log(`  EN BASE SEULEMENT  ${g.migration_name}  (dossier absent)`);

console.log(`\n>>> ${mismatch.length} checksum(s) a corriger, ${ghosts.length} ligne(s) orpheline(s).`);
for (const m of mismatch) console.log(`    ${m.name}\n      base : ${m.db}\n      reel : ${m.disk}`);

await prisma.$disconnect();