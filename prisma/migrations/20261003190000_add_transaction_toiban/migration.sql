-- Persistance de l'IBAN beneficiaire sur les virements sortants.
--
-- L'IBAN du destinataire etait valide a la saisie puis ecarte : la ligne de
-- grand livre ne gardait aucune trace de la destination. En cas de litige ou
-- d'erreur de saisie, la banque ne pouvait pas prouver ou l'argent devait
-- etre verse.
--
-- Colonne nullable : les transactions CREDIT / DEBIT n'ont pas de
-- beneficiaire, et les lignes existantes n'en ont pas.
ALTER TABLE "Transaction" ADD COLUMN "toIban" TEXT;