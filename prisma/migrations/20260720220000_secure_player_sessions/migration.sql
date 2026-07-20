ALTER TABLE "Player"
  ADD COLUMN "publicId" TEXT,
  ADD COLUMN "sessionTokenHash" TEXT,
  ADD COLUMN "sessionExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing browser cookies contain Player.id and must no longer authenticate.
UPDATE "Player"
SET
  "publicId" = md5(random()::text || clock_timestamp()::text || "id"),
  "sessionTokenHash" = 'invalidated_' || "id",
  "sessionExpiresAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Player"
  ALTER COLUMN "publicId" SET NOT NULL,
  ALTER COLUMN "sessionTokenHash" SET NOT NULL,
  ALTER COLUMN "sessionExpiresAt" SET NOT NULL;

CREATE UNIQUE INDEX "Player_sessionTokenHash_key" ON "Player"("sessionTokenHash");
CREATE UNIQUE INDEX "Player_roomId_publicId_key" ON "Player"("roomId", "publicId");
CREATE INDEX "Player_lastSeenAt_idx" ON "Player"("lastSeenAt");
