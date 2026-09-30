# ⚠️ Réconciliation des migrations — lire avant tout `prisma migrate`

## Le problème

La base de production **n'a jamais été gérée par le CLI Prisma**. Toutes les tables
et toutes les modifications ont été appliquées à la main via le SQL Editor de
Supabase. La table `_prisma_migrations` était **inexistante**.

Conséquence : le premier `prisma migrate deploy` exécuté par n'importe qui aurait
cru la base vide et tenté de recréer les 9 tables sur une base contenant déjà
23 utilisateurs, 13 comptes, 48 transactions et 61 refresh tokens.

## La solution retenue

`prisma/migrations/20260930000000_baseline_current_schema/migration.sql` décrit
l'état **vérifié** de la base (relevé par introspection : colonnes, defaults,
index, contraintes, actions référentielles). Il est marqué comme déjà appliqué,
donc `migrate deploy` le saute et n'applique que les migrations futures.

## Comment marquer le baseline (une seule fois)

```bash
npx prisma migrate resolve --applied 20260930000000_baseline_current_schema
```

À faire **une seule fois**, depuis un environnement qui atteint la base en port
5432 (`DIRECT_URL`), pas le pooler transactionnel 6543.

> Le CLI refuse le port 6543 (transaction mode) : il faut la session mode.

## Les dossiers historiques non reconnus

Ces dossiers n'unaient pas le préfixe timestamp exigé par Prisma, et **n'ont
jamais été exécutés**. Ils sont conservés pour l'historique, mais ce ne sont pas
des migrations valides :

| Dossier | Rôle |
|---|---|
| `add_refresh_token.sql` | SQL isolé à la racine, hors format |
| `add_rate_limit.sql` | idem |
| `add_account_pending_and_controls.sql` | idem |
| `add_refresh_token_consumed_at/` | dossier sans timestamp |
| `add_pan_enc_and_audit_log/` | idem |
| `add_money_guards/` | idem |

Les 5 dossiers timestampés (`20260704194759_…` → `20260813123000_…`) sont valides
en tant que nom, mais reflètent un état ancien de la base : les ennuyer de les
rejouer après le baseline n'aurait aucun sens.

## Écarts connus entre schema.prisma et la base

Le baseline reproduit **la base**, pas le schéma déclaré. Écarts assumés :

1. `AuditLog.id` sans default SQL (l'uuid est généré par le code).
2. Types temporels hétérogènes : `createdAt` en `timestamptz` partout, mais
   `updatedAt` en `timestamp without time zone` sauf sur `Transaction`.
   `RefreshToken.expiresAt/createdAt/consumedAt` sont aussi sans time zone.
3. `transaction_description_length` (CHECK ≤ 255) existe en base mais n'est
   déclaré dans aucun fichier du dépôt.
4. `account_balance_non_negative` existe en **double** (casse minuscule ET
   majuscule) : deux CHECK identiques pour la même règle. Le baseline reproduit
   la version majuscule ; le nettoyage est une migration dédiée.
5. `Account.userId`, `Card.accountId`, `Transaction.accountId` sont en
   `NO ACTION` — le code supprime les enfants explicitement avant le parent.
   Seul `RefreshToken.userId` est en `CASCADE`, ce qui est correct.

## Pour la suite

Les migrations à venir doivent :

- être ajoutées dans `prisma/migrations/<timestamp>_<nom>/migration.sql` ;
- n'être écrites qu'**après** `migrate diff`, jamais à la main ;
- être déployées via le SQL Editor ou `migrate deploy` — **plus jamais de
  migration manuelle sans laisser de trace dans `_prisma_migrations`**.

Le nettoyage des écarts (option B : supprimer la contrainte dupliquée, uniformiser
les timestamps, aligner la FK sur `schema.prisma`) n'a pas été fait : c'est un
travail séparé, à planifier sans pression sur la production.