-- Supporter perk bookkeeping: when a member last spent a bird pick.
-- A paid contribution newer than this timestamp grants another pick
-- (owner, 2026-08-18: "if they pay again they can choose another").
-- Idempotent: safe to run more than once.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birdPickedAt" TIMESTAMP(3);
