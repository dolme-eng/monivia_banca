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

> Le CLI exige la **session mode** (port 5432), pas le pooler transactionnel
> 6543. `prisma.config.ts` lit `DATABASE_URL` ; pour ces commandes, pointez-le
> sur `DIRECT_URL` :
>
> ```powershell
> $env:DATABASE_URL = ((Get-Content .env | Select-String '^DIRECT_URL=') -replace '^DIRECT_URL=','').Trim('"')
> ```

## État (résolu le 2026-10-02)

- Les 7 migrations marquées à la main ont été reprises par le vrai CLI, qui a
  recalculé leurs checksums.
- `add_refresh_token_consumed_at`, `add_pan_enc_and_audit_log` et
  `add_money_guards` sont elles aussi marquées appliquées : leurs effets
  étaient déjà en base. Sans cela, `migrate deploy` rejouait un
  `ALTER TABLE ... ADD COLUMN "consumedAt"` **sans garde** et échouait.
- `20261002090000_add_missing_indexes` a créé les 2 index déclarés dans le
  schéma mais absents de la base (`RateLimitEntry(resetAt)` et
  `Transaction(accountId, status)`).

`npx prisma migrate status` → **Database schema is up to date!**

## Dérive restante — état au 2026-10-03

`migrate diff` n'est **pas** vide, et c'est voulu. Voici ce qui a été corrigé,
et ce qui est délibérément conservé.

### Corrigé par `20261003120000_align_defaults_and_token_fks`

- **`Account.status`** : `DEFAULT 'ACTIVE'` → `'PENDING'`. Le provisioning
  passait déjà le statut explicitement, donc l'écart n'était visible que sur une
  insertion SQL brute — et le projet en fait déjà (`rate-limit.ts`). Avec ce
  défaut, un `INSERT` direct créait un compte `ACTIVE` en contournant le
  contrôle `PENDING`.
- **`RateLimitEntry.count`** : `DEFAULT 1` → `0`. Sans effet (le code insère
  toujours `count`), mais `0` est le seul défaut cohérent avec un compteur.
- **`InviteToken.userId` et `PasswordResetToken.userId`** : ces deux tables
  n'avaient **aucune clé étrangère** vers `User`, contrairement au schéma. La
  suppression d'un utilisateur y laissait des orphelins. 0 orpheline n'a été
  détectée avant de les poser (l'application supprimait les tokens
  explicitement), donc l'ajout n'a rien invalidé.

### Corrigé par `20261003150000_drop_duplicate_balance_check`

- `account_balance_non_negative` (minuscule) et
  `Account_balance_non_negative` (majuscule) étaient deux contraintes CHECK
  **strictement identiques** sur `Account.balance`. La variante minuscule,
  créée à la main, a été supprimée ; celle portée par la migration
  `add_money_guards` est conservée pour que le nom restant corresponde à
  l'historique de migrations. Comportement inchangé.

### Contraintes presentes en base mais absentes de l'historique

- `transaction_description_length` (`CHECK (length(description) <= 255)`) et
  `Transaction_amount_nonzero` existent en base mais ne sont decrites ni dans
  `schema.prisma` ni dans un fichier de migration. Les deux sont pourtant
  actives et appliquees par PostgreSQL. Pour les faire entrer dans
  l'historique, il faudrait reecrire le fichier de baseline, ce qui changerait
  son checksum et invaliderait l'alignement decrit plus haut. A traiter dans
  une operation dediee, avec `migrate resolve`.
### Conservé volontairement — ne pas « corriger » sans mesure

Ces écarts font échouer `migrate diff`, mais les corriger serait introduire un
risque sur des données réelles pour un gain nul :

| Écart | Pourquoi on le garde |
|---|---|
| `timestamptz` → `timestamp(3)` sur 9 tables | Convertir réécrit toutes les lignes vivantes et décale les valeurs si le `TimeZone` de session n'est pas UTC. Aucun bénéfice fonctionnel : l'application fonctionne ainsi depuis toujours. |
| FK en `NO ACTION` (Account, Card, Transaction) au lieu de `Restrict` | Les deux bloquent la suppression d'un parent : sémantique identique. Le seul écart réel est `ON UPDATE`, sans effet puisque les UUID ne changent pas. Recréer ces FK sur de la production pour un gain nul n'est pas justifié. |
| `ON UPDATE` manquant sur les FK `CASCADE` | Même raison : aucune clé primaire n'est jamais mise à jour. |
| `DROP DEFAULT` sur les `id` (PK) | La base a `DEFAULT gen_random_uuid()`, le schéma non. Ce défaut est une protection utile contre un `INSERT` SQL forgetant l'id — or le projet écrit déjà du SQL brut. |
| `DROP TABLE "_prisma_migrations_lock"` | C'est **la table de verrou de Prisma**. `migrate diff` veut la supprimer parce qu'elle n'est pas modélisée ; la faire tomber pendant qu'une migration court serait une catastrophe. Ne jamais appliquer ce `DROP`. |
| `AuditLog.id` sans default SQL | L'uuid est généré par le code. |

> **En cas de `migrate diff` non vide :** lire cette table avant d'écrire une
> migration. Un diff vide n'est pas l'objectif ; l'absence de régression l'est.
> Pour récupérer un historique de modifications, `migrate diff` reste
> l'outil adapté — mais filtrer les écarts ci-dessus avant de générer du SQL.

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