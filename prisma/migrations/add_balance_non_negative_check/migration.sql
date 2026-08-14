-- Add CHECK constraint to prevent negative balances
ALTER TABLE "Account" ADD CONSTRAINT account_balance_non_negative CHECK (balance >= 0);
