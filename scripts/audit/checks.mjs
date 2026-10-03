import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const c = await prisma.$queryRawUnsafe(`
  SELECT conname, pg_get_constraintdef(oid) AS def, convalidated
  FROM pg_constraint
  WHERE contype = 'c' AND conrelid = '"Account"'::regclass
  ORDER BY conname`);
console.log("=== contraintes CHECK sur Account ===");
for (const x of c) console.log(`  ${x.conname}\n     ${x.def}\n     validee=${x.convalidated}`);
const all = await prisma.$queryRawUnsafe(`
  SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace ORDER BY tbl, conname`);
console.log("\n=== toutes les contraintes CHECK du schema public ===");
for (const x of all) console.log(`  ${x.tbl.padEnd(22)} ${x.conname}\n     ${x.def}`);
await prisma.$disconnect();
