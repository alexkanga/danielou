-- Migration 0009: Better Auth 1.7.1 account table compatibility
-- Adds 'issuer' and 'password' fields required by BA 1.7.1's findCredentialAccount
-- and signInUsername. Non-destructive: only adds nullable columns and backfills.

ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "password" text;

-- Backfill existing credential accounts
UPDATE "account"
SET "issuer" = 'local:credential',
    "password" = COALESCE("access_token", "password")
WHERE "provider_id" = 'credential'
  AND ("issuer" IS NULL OR "password" IS NULL);
