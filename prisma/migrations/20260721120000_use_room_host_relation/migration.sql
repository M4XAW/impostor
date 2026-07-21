UPDATE "Room" AS room
SET "hostId" = (
  SELECT player."id"
  FROM "Player" AS player
  WHERE player."roomId" = room."id"
    AND player."isHost" = true
  ORDER BY player."createdAt" ASC
  LIMIT 1
);

CREATE UNIQUE INDEX "Room_hostId_key" ON "Room"("hostId");

ALTER TABLE "Room"
ADD CONSTRAINT "Room_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "Player"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Player" DROP COLUMN "isHost";
