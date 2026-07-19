-- CreateTable
CREATE TABLE "WordPair" (
    "id" TEXT NOT NULL,
    "civilianWord" TEXT NOT NULL,
    "impostorWord" TEXT NOT NULL,
    "normalizedCivilianWord" TEXT NOT NULL,
    "normalizedImpostorWord" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WordPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomWord" (
    "id" TEXT NOT NULL,
    "wordNumber" INTEGER NOT NULL,
    "civilianWord" TEXT NOT NULL,
    "impostorWord" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sourceWordPairId" TEXT,
    CONSTRAINT "RoomWord_pkey" PRIMARY KEY ("id")
);

-- Preserve the current word of games that were already running before this migration.
INSERT INTO "RoomWord" ("id", "wordNumber", "civilianWord", "impostorWord", "roomId")
SELECT 'legacy_' || "id" || '_' || "wordNumber", "wordNumber", "secretWord", "secretWord", "id"
FROM "Room"
WHERE "secretWord" IS NOT NULL;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "secretWord";

-- AlterTable
ALTER TABLE "Clue" ADD COLUMN "normalizedContent" TEXT;

WITH normalized_clues AS (
    SELECT
        "id",
        LOWER(REGEXP_REPLACE(BTRIM("content"), '\s+', ' ', 'g')) AS normalized_value,
        ROW_NUMBER() OVER (
            PARTITION BY "roomId", "wordNumber", LOWER(REGEXP_REPLACE(BTRIM("content"), '\s+', ' ', 'g'))
            ORDER BY "createdAt", "id"
        ) AS occurrence
    FROM "Clue"
)
UPDATE "Clue" AS clue
SET "normalizedContent" = CASE
    WHEN normalized_clues.occurrence = 1 THEN normalized_clues.normalized_value
    ELSE normalized_clues.normalized_value || ' legacy ' || clue."id"
END
FROM normalized_clues
WHERE clue."id" = normalized_clues."id";

ALTER TABLE "Clue" ALTER COLUMN "normalizedContent" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WordPair_normalizedCivilianWord_normalizedImpostorWord_key" ON "WordPair"("normalizedCivilianWord", "normalizedImpostorWord");
CREATE INDEX "WordPair_isActive_idx" ON "WordPair"("isActive");
CREATE UNIQUE INDEX "RoomWord_roomId_wordNumber_key" ON "RoomWord"("roomId", "wordNumber");
CREATE UNIQUE INDEX "RoomWord_roomId_sourceWordPairId_key" ON "RoomWord"("roomId", "sourceWordPairId");
CREATE INDEX "RoomWord_roomId_idx" ON "RoomWord"("roomId");
CREATE UNIQUE INDEX "Clue_roomId_wordNumber_normalizedContent_key" ON "Clue"("roomId", "wordNumber", "normalizedContent");

-- AddForeignKey
ALTER TABLE "RoomWord" ADD CONSTRAINT "RoomWord_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomWord" ADD CONSTRAINT "RoomWord_sourceWordPairId_fkey" FOREIGN KEY ("sourceWordPairId") REFERENCES "WordPair"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SeedData
INSERT INTO "WordPair" (
    "id",
    "civilianWord",
    "impostorWord",
    "normalizedCivilianWord",
    "normalizedImpostorWord",
    "updatedAt"
) VALUES
    ('word_pair_01', 'Volcan', 'Geyser', 'volcan', 'geyser', CURRENT_TIMESTAMP),
    ('word_pair_02', 'Cinéma', 'Théâtre', 'cinema', 'theatre', CURRENT_TIMESTAMP),
    ('word_pair_03', 'Pirate', 'Corsaire', 'pirate', 'corsaire', CURRENT_TIMESTAMP),
    ('word_pair_04', 'Boussole', 'Carte', 'boussole', 'carte', CURRENT_TIMESTAMP),
    ('word_pair_05', 'Piano', 'Guitare', 'piano', 'guitare', CURRENT_TIMESTAMP),
    ('word_pair_06', 'Jungle', 'Tropiques', 'jungle', 'tropiques', CURRENT_TIMESTAMP),
    ('word_pair_07', 'Astronaute', 'Pilote', 'astronaute', 'pilote', CURRENT_TIMESTAMP),
    ('word_pair_08', 'Chocolat', 'Caramel', 'chocolat', 'caramel', CURRENT_TIMESTAMP),
    ('word_pair_09', 'Phare', 'Lampadaire', 'phare', 'lampadaire', CURRENT_TIMESTAMP),
    ('word_pair_10', 'Désert', 'Savane', 'desert', 'savane', CURRENT_TIMESTAMP),
    ('word_pair_11', 'Lune', 'Soleil', 'lune', 'soleil', CURRENT_TIMESTAMP),
    ('word_pair_12', 'Train', 'Métro', 'train', 'metro', CURRENT_TIMESTAMP),
    ('word_pair_13', 'Fusée', 'Avion', 'fusee', 'avion', CURRENT_TIMESTAMP),
    ('word_pair_14', 'Montagne', 'Colline', 'montagne', 'colline', CURRENT_TIMESTAMP),
    ('word_pair_15', 'Océan', 'Mer', 'ocean', 'mer', CURRENT_TIMESTAMP),
    ('word_pair_16', 'Bibliothèque', 'Librairie', 'bibliotheque', 'librairie', CURRENT_TIMESTAMP),
    ('word_pair_17', 'Robot', 'Ordinateur', 'robot', 'ordinateur', CURRENT_TIMESTAMP),
    ('word_pair_18', 'Forêt', 'Parc', 'foret', 'parc', CURRENT_TIMESTAMP),
    ('word_pair_19', 'Musée', 'Galerie', 'musee', 'galerie', CURRENT_TIMESTAMP),
    ('word_pair_20', 'Tempête', 'Ouragan', 'tempete', 'ouragan', CURRENT_TIMESTAMP);
