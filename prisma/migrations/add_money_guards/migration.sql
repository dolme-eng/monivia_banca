-- Migration: money guards at the DB level (defense in depth — the app
-- already enforces these, but a manual SQL write or future bug must not be
-- able to persist a negative balance or a zero-amount movement).
-- Run in Supabase Dashboard > SQL Editor. Idempotent.
-- NOTE: fails if existing rows violate the checks — inspect first with the
-- SELECTs at the bottom.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_balance_non_negative') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_balance_non_negative" CHECK (balance >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_currency_eur_only') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_currency_eur_only" CHECK (currency = 'EUR');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_amount_nonzero') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_amount_nonzero" CHECK (amount <> 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Card_last4_len4') THEN
    ALTER TABLE "Card" ADD CONSTRAINT "Card_last4_len4" CHECK (char_length(last4) = 4);
  END IF;
END $$;

-- Pre-flight inspection (run these first if unsure):
-- SELECT id, balance FROM "Account" WHERE balance < 0 LIMIT 10;
-- SELECT DISTINCT currency FROM "Account";
-- SELECT id, amount FROM "Transaction" WHERE amount = 0 LIMIT 10;
-- SELECT id, last4 FROM "Card" WHERE char_length(last4) <> 4 LIMIT 10;
