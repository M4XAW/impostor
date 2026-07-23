CREATE TYPE "WinnerTeam" AS ENUM ('CIVILIANS', 'IMPOSTORS');

UPDATE "Room"
SET "winner" = 'IMPOSTORS'
WHERE "winner" = 'IMPOSTOR';

ALTER TABLE "Room"
ALTER COLUMN "winner" TYPE "WinnerTeam"
USING "winner"::"WinnerTeam";

ALTER TABLE "Player"
ADD COLUMN "isReady" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Vote"
ADD COLUMN "matchNumber" INTEGER NOT NULL DEFAULT 1;

UPDATE "Vote" AS vote
SET "matchNumber" = room."wordNumber"
FROM "Room" AS room
WHERE vote."roomId" = room."id";

DROP INDEX "Vote_roomId_voterId_key";

CREATE UNIQUE INDEX "Vote_roomId_matchNumber_voterId_key"
ON "Vote"("roomId", "matchNumber", "voterId");

CREATE TABLE "MatchResult" (
  "id" TEXT NOT NULL,
  "matchNumber" INTEGER NOT NULL,
  "winner" "WinnerTeam" NOT NULL,
  "civilianWord" TEXT NOT NULL,
  "impostorWord" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "roomId" TEXT NOT NULL,

  CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchPlayerResult" (
  "id" TEXT NOT NULL,
  "playerPublicId" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "role" "PlayerRole" NOT NULL,
  "receivedVoteCount" INTEGER NOT NULL,
  "votedForImpostor" BOOLEAN NOT NULL,
  "isMatchWinner" BOOLEAN NOT NULL,
  "matchResultId" TEXT NOT NULL,

  CONSTRAINT "MatchPlayerResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchResult_roomId_matchNumber_key"
ON "MatchResult"("roomId", "matchNumber");

CREATE INDEX "MatchResult_roomId_idx"
ON "MatchResult"("roomId");

CREATE UNIQUE INDEX "MatchPlayerResult_matchResultId_playerPublicId_key"
ON "MatchPlayerResult"("matchResultId", "playerPublicId");

CREATE INDEX "MatchPlayerResult_matchResultId_idx"
ON "MatchPlayerResult"("matchResultId");

ALTER TABLE "MatchResult"
ADD CONSTRAINT "MatchResult_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchPlayerResult"
ADD CONSTRAINT "MatchPlayerResult_matchResultId_fkey"
FOREIGN KEY ("matchResultId") REFERENCES "MatchResult"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
