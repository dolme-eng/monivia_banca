-- Contrainte CHECK dupliquee sur "Account".
--
-- "account_balance_non_negative" (minuscule, creee a la main) et
-- "Account_balance_non_negative" (majuscule, portee par la migration
-- add_money_guards) sont strictement identiques : CHECK ((balance >= 0)).
--
-- On retire la variante minuscule, conservee pour que le nom restant soit
-- celui reference par l'historique de migrations. Comportement inchange : les
-- deux contraintes validaient la meme regle, et la colonne est NOT NULL.
ALTER TABLE "Account" DROP CONSTRAINT account_balance_non_negative;