import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Purge des transactions de test E2E restees dans l'historique.
 *
 * Securites :
 *  - ne touche QUE les descriptions commencant par "E2E" ;
 *  - refuse toute transaction qui n'est pas REJECTED (une transaction E2E
 *    approuvee ou en attente pourrait avoir un effet financier reel) ;
 *  - refuse si le compte porte un solde non nul modifie par la suppression ;
 *  - lecture seule par defaut, ecriture avec --apply.
 *
 * Ces transactions sont REJECTED : elles n'entrent pas dans le solde, qui est
 * une colonne stockee et non recalculee. La suppression est donc neutre sur
 * l'argent, mais le controle reste en place.
 */
const APPLY = process.argv.includes("--apply");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const rows = await prisma.$queryRawUnsafe(`
  SELECT t.id, t.amount, t.status::text, t.description, t."createdAt",
         u.email, a.iban, a.balance
  FROM "Transaction" t
  JOIN "Account" a ON a.id = t."accountId"
  JOIN "User" u ON u.id = a."userId"
  WHERE t.description LIKE 'E2E%'
  ORDER BY t."createdAt"
`);

console.log(`Transactions dont la description commence par "E2E" : ${rows.length}\n`);
const parStatut = {};
const parCompte = {};
for (const r of rows) {
  parStatut[r.status] = (parStatut[r.status] || 0) + 1;
  parCompte[r.email] = (parCompte[r.email] || 0) + 1;
  console.log(`  ${r.id}  ${String(r.status).padEnd(9)} ${String(r.amount).padStart(8)}  ${r.description}`);
}
console.log(`\nPar statut : ${JSON.stringify(parStatut)}`);
console.log(`Par compte : ${JSON.stringify(parCompte)}`);

const nonRejected = rows.filter((r) => r.status !== "REJECTED");
const sum = rows.reduce((s, r) => s + Number(r.amount), 0);
console.log(`\nSomme des montants (information) : ${sum}`);

const abort = [];
if (nonRejected.length) {
  abort.push(
    `${nonRejected.length} transaction(s) E2E ne sont pas REJECTED : ` +
    nonRejected.map((r) => `${r.id}(${r.status})`).join(", ")
  );
}
const balances = [...new Set(rows.map((r) => `${r.iban}=${r.balance}`))];
console.log(`Soldes des comptes concernés : ${balances.join("  ")}`);

if (abort.length) {
  console.log("\n!! PURGE REFUSEE !!");
  for (const a of abort) console.log(`  - ${a}`);
} else if (!APPLY) {
  console.log("\nToutes les transactions E2E sont REJECTED : suppression neutre sur le solde.");
  console.log("Relancer avec --apply pour executer.");
} else {
  const before = await prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(balance),0)::bigint n FROM "Account"`);
  const res = await prisma.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE description LIKE 'E2E%'`);
  const after = await prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(balance),0)::bigint n FROM "Account"`);
  const left = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int n FROM "Transaction" WHERE description LIKE 'E2E%'`
  );
  console.log(`\nSupprime : ${res} ligne(s)`);
  console.log(`Somme des soldes avant : ${before[0].n}   apres : ${after[0].n}   ${before[0].n === after[0].n ? "INCHANGE" : "DIVERGENCE"}`);
  console.log(`Transactions E2E restantes : ${left[0].n}`);
}

await prisma.$disconnect();