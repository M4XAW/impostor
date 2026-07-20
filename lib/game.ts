import { PlayerRole, Prisma, RoomPhase } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { GameSnapshot } from "@/types/game";

const MAX_ROOM_CODE_ATTEMPTS = 5;

export interface RoomSettings { wordCount: number; roundCount: number; turnSeconds: number; impostorCount: number; }

function isHost(players: Array<{ id: string; isHost: boolean }>, playerId: string) { return players.some((player) => player.id === playerId && player.isHost); }

function shuffle<T>(items: readonly T[]) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
    const randomIndex = randomValue % (index + 1);
    [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
  }

  return shuffledItems;
}

function normalizeClueContent(content: string) {
  return content
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .match(/[\p{L}\p{N}]+/gu)
    ?.join(" ") ?? "";
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${Array.from(bytes.slice(0, 3), (byte) => alphabet[byte % alphabet.length]).join("")}-${Array.from(bytes.slice(3), (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export async function createRoom(name: string) {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.room.create({ data: { code: createRoomCode(), players: { create: { name, isHost: true } } }, include: { players: true } });
    } catch (error) {
      const isRoomCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isRoomCodeCollision) {
        throw error;
      }
    }
  }
  throw new Error("Impossible de créer une partie pour le moment.");
}

export async function joinRoom(code: string, name: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room) throw new Error("Cette partie n'existe pas.");
  if (room.phase !== RoomPhase.LOBBY) throw new Error("Cette partie a déjà commencé.");
  if (room.players.length >= 6) throw new Error("Cette partie est complète.");
  return { room, player: await prisma.player.create({ data: { roomId: room.id, name } }) };
}

export async function isPlayerInRoom(code: string, playerId: string) {
  return Boolean(await prisma.player.findFirst({
    where: { id: playerId, room: { code } },
    select: { id: true },
  }));
}

export async function removePlayer(code: string, playerId: string) {
  return prisma.$transaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });
    const departingPlayerIndex = room?.players.findIndex((player) => player.id === playerId) ?? -1;

    if (!room || departingPlayerIndex < 0) return false;

    const departingPlayer = room.players[departingPlayerIndex];
    const remainingPlayers = room.players.filter((player) => player.id !== playerId);

    if (remainingPlayers.length === 0) {
      await transaction.room.delete({ where: { id: room.id } });
      return true;
    }

    await transaction.player.delete({ where: { id: playerId } });

    if (departingPlayer.isHost) {
      await transaction.player.update({
        where: { id: remainingPlayers[0].id },
        data: { isHost: true },
      });
    }

    if (room.phase !== RoomPhase.LOBBY && room.phase !== RoomPhase.RESULTS && remainingPlayers.length < 3) {
      await transaction.room.update({
        where: { id: room.id },
        data: { phase: RoomPhase.RESULTS, winner: null, turnEndsAt: null },
      });
      return true;
    }

    if (room.phase === RoomPhase.DISCUSSION) {
      const departingPlayerHadTurn = departingPlayerIndex === room.currentPlayerIndex;
      const currentPlayerIndex = departingPlayerIndex < room.currentPlayerIndex
        ? room.currentPlayerIndex - 1
        : Math.min(room.currentPlayerIndex, remainingPlayers.length - 1);

      await transaction.room.update({
        where: { id: room.id },
        data: {
          currentPlayerIndex,
          turnEndsAt: departingPlayerHadTurn
            ? new Date(Date.now() + room.turnSeconds * 1000)
            : room.turnEndsAt,
        },
      });
    }

    return true;
  });
}

export async function updateSettings(code: string, playerId: string, settings: RoomSettings) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room || !isHost(room.players, playerId) || room.phase !== RoomPhase.LOBBY) throw new Error("Seul l'hôte peut modifier les paramètres avant le départ.");
  await prisma.room.update({ where: { id: room.id }, data: settings });
}

export async function startGame(code: string, playerId: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: { orderBy: { createdAt: "asc" } } } });
  if (!room || !isHost(room.players, playerId)) throw new Error("Action non autorisée.");
  if (room.phase !== RoomPhase.LOBBY || room.players.length < 3) throw new Error("Il faut au moins trois joueurs pour démarrer.");
  if (room.impostorCount > room.players.length - 2) throw new Error("Le nombre d’imposteurs est trop élevé.");
  const availableWordPairs = await prisma.wordPair.findMany({
    where: { isActive: true },
    select: { id: true, civilianWord: true, impostorWord: true },
  });
  if (availableWordPairs.length < room.wordCount) throw new Error("Il n’y a pas assez de paires de mots actives pour démarrer cette partie.");
  const selectedWordPairs = shuffle(availableWordPairs).slice(0, room.wordCount);
  const impostors = shuffle(room.players).slice(0, room.impostorCount);
  const turnEndsAt = new Date(Date.now() + room.turnSeconds * 1000);
  await prisma.$transaction([
    prisma.player.updateMany({ where: { roomId: room.id }, data: { role: PlayerRole.CIVILIAN } }),
    ...impostors.map((player) => prisma.player.update({ where: { id: player.id }, data: { role: PlayerRole.IMPOSTOR } })),
    prisma.roomWord.createMany({
      data: selectedWordPairs.map((wordPair, index) => ({
        roomId: room.id,
        sourceWordPairId: wordPair.id,
        wordNumber: index + 1,
        civilianWord: wordPair.civilianWord,
        impostorWord: wordPair.impostorWord,
      })),
    }),
    prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.DISCUSSION, wordNumber: 1, roundNumber: 1, currentPlayerIndex: 0, turnEndsAt } }),
  ]);
}

async function synchronizeTurn(code: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: { orderBy: { createdAt: "asc" } } } });
  if (!room || room.phase !== RoomPhase.DISCUSSION || !room.turnEndsAt || room.turnEndsAt > new Date()) return room;
  const nextIndex = room.currentPlayerIndex + 1;
  const completedRound = nextIndex >= room.players.length;
  const nextRound = completedRound ? room.roundNumber + 1 : room.roundNumber;
  const nextWord = completedRound && nextRound > room.roundCount ? room.wordNumber + 1 : room.wordNumber;
  if (nextWord > room.wordCount) {
    return prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.VOTING, turnEndsAt: null } });
  }
  const newRound = completedRound && nextRound > room.roundCount ? 1 : nextRound;
  return prisma.room.update({ where: { id: room.id }, data: { currentPlayerIndex: completedRound ? 0 : nextIndex, roundNumber: newRound, wordNumber: nextWord, turnEndsAt: new Date(Date.now() + room.turnSeconds * 1000) } });
}

export async function submitClue(code: string, playerId: string, content: string) {
  const room = await synchronizeTurn(code);
  const players = await prisma.player.findMany({ where: { roomId: room?.id }, orderBy: { createdAt: "asc" } });
  if (!room || room.phase !== RoomPhase.DISCUSSION || players[room.currentPlayerIndex]?.id !== playerId) throw new Error("Ce n'est pas votre tour.");
  const normalizedContent = normalizeClueContent(content);
  if (!normalizedContent) throw new Error("Saisis un mot contenant au moins une lettre ou un chiffre.");
  try {
    await prisma.clue.create({ data: { roomId: room.id, playerId, content: content.trim(), normalizedContent, wordNumber: room.wordNumber, roundNumber: room.roundNumber } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ce mot a déjà été proposé pendant cette manche.");
    }
    throw error;
  }
  await prisma.room.update({ where: { id: room.id }, data: { turnEndsAt: new Date(0) } });
  await synchronizeTurn(code);
}

export async function beginVote(code: string, playerId: string) {
  const room = await synchronizeTurn(code);
  const players = await prisma.player.findMany({ where: { roomId: room?.id } });
  if (!room || !isHost(players, playerId)) throw new Error("Action non autorisée.");
  if (room.phase !== RoomPhase.DISCUSSION || room.roundNumber === 1 && room.wordNumber === 1) throw new Error("Terminez au moins un tour complet avant le vote.");
  await prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.VOTING, turnEndsAt: null } });
}

export async function castVote(code: string, voterId: string, targetId: string) {
  if (voterId === targetId) throw new Error("Vous ne pouvez pas voter pour vous-même.");
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true, votes: true } });
  if (!room || room.phase !== RoomPhase.VOTING || !room.players.some((player) => player.id === voterId) || !room.players.some((player) => player.id === targetId)) throw new Error("Vote invalide.");
  await prisma.vote.upsert({ where: { roomId_voterId: { roomId: room.id, voterId } }, create: { roomId: room.id, voterId, targetId }, update: { targetId } });
  const votes = await prisma.vote.findMany({ where: { roomId: room.id } });
  if (votes.length === room.players.length) {
    const totals = new Map<string, number>();
    votes.forEach((vote) => totals.set(vote.targetId, (totals.get(vote.targetId) ?? 0) + 1));
    const highestScore = Math.max(...totals.values());
    const mostVoted = new Set([...totals].filter(([, score]) => score === highestScore).map(([playerId]) => playerId));
    const civiliansWin = room.players.some((player) => player.role === PlayerRole.IMPOSTOR && mostVoted.has(player.id));
    await prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.RESULTS, winner: civiliansWin ? "CIVILIANS" : "IMPOSTOR" } });
  }
}

export async function getSnapshot(code: string, playerId: string): Promise<GameSnapshot | null> {
  await synchronizeTurn(code);
  const room = await prisma.room.findUnique({ where: { code }, include: { players: { orderBy: { createdAt: "asc" } }, votes: { include: { voter: true, target: true } }, clues: { include: { player: true }, orderBy: { createdAt: "asc" } }, words: { orderBy: { wordNumber: "asc" } } } });
  const currentPlayer = room?.players.find((player) => player.id === playerId);
  if (!room || !currentPlayer) return null;
  const currentTurnPlayer = room.players[room.currentPlayerIndex];
  const currentWord = room.words.find((word) => word.wordNumber === room.wordNumber);
  return { code: room.code, phase: room.phase, settings: { wordCount: room.wordCount, roundCount: room.roundCount, turnSeconds: room.turnSeconds, impostorCount: room.impostorCount }, turn: room.phase === RoomPhase.DISCUSSION && room.turnEndsAt && currentTurnPlayer ? { wordNumber: room.wordNumber, roundNumber: room.roundNumber, currentPlayerId: currentTurnPlayer.id, endsAt: room.turnEndsAt.toISOString(), canStartVote: room.roundNumber > 1 || room.wordNumber > 1 } : undefined, players: room.players.map((player) => ({ id: player.id, name: player.name, isHost: player.isHost, hasVoted: room.votes.some((vote) => vote.voterId === player.id) })), currentPlayer: { id: currentPlayer.id, name: currentPlayer.name, isHost: currentPlayer.isHost, word: room.phase === RoomPhase.LOBBY ? undefined : currentPlayer.role === PlayerRole.IMPOSTOR ? currentWord?.impostorWord : currentWord?.civilianWord }, clues: room.clues.map((clue) => ({ id: clue.id, playerId: clue.playerId, content: clue.content, playerName: clue.player.name, wordNumber: clue.wordNumber, roundNumber: clue.roundNumber })), votes: room.votes.map((vote) => ({ voterName: vote.voter.name, targetName: vote.target.name })), winner: room.winner === "CIVILIANS" || room.winner === "IMPOSTOR" ? room.winner : undefined, endReason: room.phase === RoomPhase.RESULTS && !room.winner ? "NOT_ENOUGH_PLAYERS" : undefined };
}
