import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Recalcule le SHA-256 reel de chaque migration.sql et l'ecrit dans
 * _prisma_migrations, en remplacement du placeholder "baselined-by-hand".
 *
 * Prisma hashtype les OCTETS du fichier : les migrations sont donc forcees en
 * LF via .gitattributes, sinon le checksum dependrait de la plateforme.
 *
 * Seule la colonne `checksum` est modifiee : ni finished_at, ni
 * applied_steps_count, ni le contenu de la base.
 */
const APPLY = process.argv.includes("--apply");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DIR = "prisma/migrations";

const rows = await prisma.$queryRawUnsafe(
  `SELECT migration_name, checksum FROM "_prisma_migrations"`
);
const byName = new Map(rows.map((r) => [r.migration_name, r.checksum]));

const folders = readdirSync(DIR).filter((d) => existsSync(join(DIR, d, "migration.sql")));
const fixes = [];
for (const name of folders) {
  const buf = readFileSync(join(DIR, name, "migration.sql"));
  if (buf.includes("\r\n")) throw new Error(`${name} est encore en CRLF : refusing d'ecrire un checksum dependant de la plateforme.`);
  const sha = createHash("sha256").update(buf).digest("hex");
  const current = byName.get(name);
  if (current === undefined) {
    console.log(`  ABSENT EN BASE  ${name}  (aucune ecriture)`);
    continue;
  }
  if (current === sha) {
    console.log(`  deja conforme   ${name}`);
    continue;
  }
  fixes.push({ name, from: current, to: sha });
  console.log(`  a corriger      ${name}\n      ${current ?? "NULL"}\n   -> ${sha}`);
}

if (fixes.length === 0) {
  console.log("\nAucun checksum divergent. Rien a faire.");
} else if (!APPLY) {
  console.log(`\n${fixes.length} correction(s) a appliquer. Relancer avec --apply.`);
} else {
  for (const f of fixes) {
    const r = await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2 AND checksum IS NOT DISTINCT FROM $3`,
      f.to, f.name, f.from
    );
    console.log(`  UPDATE ${f.name} -> ${r} ligne(s)`);
  }

  const after = await prisma.$queryRawUnsafe(
    `SELECT migration_name, checksum FROM "_prisma_migrations"`
  );
  const afterMap = new Map(after.map((r) => [r.migration_name, r.checksum]));
  let bad = 0;
  for (const name of folders) {
    const buf = readFileSync(join(DIR, name, "migration.sql"));
    const sha = createHash("sha256").update(buf).digest("hex");
    if (afterMap.get(name) !== sha) { console.log(`  DIVERGENT ${name}`); bad++; }
  }
  console.log(`\nVerification : ${bad} divergence(s) restante(s) sur ${folders.length} migrations.`);
}

await prisma.$disconnect();