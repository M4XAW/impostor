-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoomPhase" AS ENUM ('LOBBY', 'DISCUSSION', 'VOTING', 'RESULTS');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('CIVILIAN', 'IMPOSTOR');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phase" "RoomPhase" NOT NULL DEFAULT 'LOBBY',
    "hostId" TEXT,
    "secretWord" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PlayerRole" NOT NULL DEFAULT 'CIVILIAN',
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
CREATE INDEX "Player_roomId_idx" ON "Player"("roomId");
CREATE INDEX "Vote_roomId_idx" ON "Vote"("roomId");
CREATE UNIQUE INDEX "Vote_roomId_voterId_key" ON "Vote"("roomId", "voterId");

ALTER TABLE "Player" ADD CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
