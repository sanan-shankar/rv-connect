-- Index for the notification bell's keyset pagination (userId, createdAt desc
-- walk) and the 100-per-user prune's cutoff lookup (2026-08-13). Idempotent.
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");
