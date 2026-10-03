-- Réconciliation ciblée de la dérive Prisma.
--
-- Seules les divergences qui ont un effet de comportement sont corrigées ici.
-- Les autres écarts sont volontairement conservés : voir
-- prisma/migrations/README-MIGRATIONS.md, section "Dérive assumée".

-- Account.status : le schéma Prisma déclare @default(PENDING), la base
-- portait DEFAULT 'ACTIVE'. Le provisioning passe toujours le statut
-- explicitement (PENDING), donc l'écart n'était visible que sur une insertion
-- en SQL brut — or le projet en fait déjà (rate-limit). Avec ce défaut, un
-- INSERT direct créait un compte ACTIVE en contournant le contrôle PENDING.
ALTER TABLE "Account" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- RateLimitEntry.count : aligne la base sur @default(0). Le code insère
-- toujours count explicitement, l'écart était donc sans effet, mais 0
-- ("aucune tentative") est le seul défaut cohérent avec un compteur.
ALTER TABLE "RateLimitEntry" ALTER COLUMN "count" SET DEFAULT 0;

-- InviteToken et PasswordResetToken n'avaient AUCUNE clé étrangère vers User,
-- contrairement à ce que décrit le schéma : la suppression d'un utilisateur
-- y laissait des lignes orphelines. Aucune FK existait donc à.drop, et 0
-- orpheline n'a été détectée avant de poser celles-ci.
--   ON UPDATE CASCADE : aligné sur le reste du schéma.
ALTER TABLE "InviteToken"
  ADD CONSTRAINT "InviteToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;