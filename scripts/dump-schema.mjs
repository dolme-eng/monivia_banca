import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const cols = await prisma.$queryRawUnsafe(`
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`);

let cur = null;
for (const c of cols) {
  if (c.table_name !== cur) { cur = c.table_name; console.log(`\n=== ${cur} ===`); }
  const d = c.column_default ? `  default=${String(c.column_default).slice(0, 42)}` : "";
  console.log(`  ${String(c.column_name).padEnd(22)} ${String(c.data_type).padEnd(26)}${d}`);
}

const fks = await prisma.$queryRawUnsafe(`
  SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name
`);
console.log("\n=== Foreign keys (ordre de suppression) ===");
for (const f of fks) console.log(`  ${f.table_name}.${f.column_name} -> ${f.ref_table}  ON DELETE ${f.delete_rule}`);

await prisma.$disconnect();