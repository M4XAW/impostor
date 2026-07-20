import { randomInt, randomUUID } from "node:crypto";
import { PlayerRole, Prisma, RoomPhase } from "@/generated/prisma/client";
import { PublicError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { PlayerSessionCredential } from "@/lib/session-token";
import type { GameState } from "@/types/game";

const MAX_ROOM_CODE_ATTEMPTS = 5;
const MAX_TRANSACTION_ATTEMPTS = 4;
const MAX_PLAYERS = 6;
const STALE_LOBBY_PLAYER_MS = 2 * 60 * 1000;
const EXPIRED_ROOM_MS = 12 * 60 * 60 * 1000;

export interface RoomSettings {
  wordCount: number;
  roundCount: number;
  turnSeconds: number;
  impostorCount: number;
}

type RoomWithPlayers = Prisma.RoomGetPayload<{
  include: { players: true };
}>;

function isHost(players: Array<{ id: string; isHost: boolean }>, playerId: string) {
  return players.some((player) => player.id === playerId && player.isHost);
}

function playerSessionData(credential: PlayerSessionCredential) {
  return {
    publicId: randomUUID(),
    sessionTokenHash: credential.tokenHash,
    sessionExpiresAt: credential.expiresAt,
    lastSeenAt: new Date(),
  };
}

function shuffle<T>(items: readonly T[]) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(index + 1);
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

async function runSerializable<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < MAX_TRANSACTION_ATTEMPTS - 1;

      if (!shouldRetry) throw error;
    }
  }

  throw new Error("Transaction retry limit reached.");
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const characters = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]);
  return `${characters.slice(0, 3).join("")}-${characters.slice(3).join("")}`;
}

export async function pruneExpiredRooms() {
  const cutoff = new Date(Date.now() - EXPIRED_ROOM_MS);

  await prisma.room.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      players: { none: { lastSeenAt: { gte: cutoff } } },
    },
  });
}

async function pruneStaleLobbyPlayers(code: string) {
  const cutoff = new Date(Date.now() - STALE_LOBBY_PLAYER_MS);

  return runSerializable(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });

    if (!room || room.phase !== RoomPhase.LOBBY) return false;

    const stalePlayers = room.players.filter(
      (player) => player.lastSeenAt < cutoff || player.sessionExpiresAt <= new Date(),
    );

    if (stalePlayers.length === 0) return false;

    const stalePlayerIds = new Set(stalePlayers.map((player) => player.id));
    const remainingPlayers = room.players.filter((player) => !stalePlayerIds.has(player.id));

    if (remainingPlayers.length === 0) {
      await transaction.room.delete({ where: { id: room.id } });
      return true;
    }

    await transaction.player.deleteMany({
      where: { id: { in: [...stalePlayerIds] }, roomId: room.id },
    });

    if (stalePlayers.some((player) => player.isHost)) {
      await transaction.player.update({
        where: { id: remainingPlayers[0].id },
        data: { isHost: true },
      });
    }

    return true;
  });
}

export async function createRoom(name: string, credential: PlayerSessionCredential) {
  await pruneExpiredRooms();

  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.room.create({
        data: {
          code: createRoomCode(),
          players: {
            create: {
              name,
              isHost: true,
              ...playerSessionData(credential),
            },
          },
        },
        include: { players: true },
      });
    } catch (error) {
      const isUniqueCollision =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

      if (!isUniqueCollision) throw error;
    }
  }

  throw new PublicError("Impossible de créer une partie pour le moment.", 503);
}

export async function joinRoom(code: string, name: string, credential: PlayerSessionCredential) {
  await pruneStaleLobbyPlayers(code);

  return runSerializable(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room) throw new PublicError("Cette partie n'existe pas.", 404);
    if (room.phase !== RoomPhase.LOBBY) throw new PublicError("Cette partie a déjà commencé.", 409);
    if (room.players.length >= MAX_PLAYERS) throw new PublicError("Cette partie est complète.", 409);

    const player = await transaction.player.create({
      data: {
        roomId: room.id,
        name,
        ...playerSessionData(credential),
      },
    });

    return { room, player };
  });
}

export async function removePlayer(code: string, playerId: string) {
  return runSerializable(async (transaction) => {
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

    if (room.phase === RoomPhase.VOTING) {
      await finalizeVoteIfComplete(transaction, room.id, remainingPlayers);
    }

    return true;
  });
}

export async function updateSettings(code: string, playerId: string, settings: RoomSettings) {
  await runSerializable(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room || !isHost(room.players, playerId) || room.phase !== RoomPhase.LOBBY) {
      throw new PublicError("Seul l'hôte peut modifier les paramètres avant le départ.", 403);
    }

    await transaction.room.update({ where: { id: room.id }, data: settings });
  });
}

export async function transferHost(code: string, currentHostId: string, targetPlayerPublicId: string) {
  await runSerializable(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room || room.phase !== RoomPhase.LOBBY) {
      throw new PublicError("L’hôte peut être transféré uniquement avant le début de la partie.", 409);
    }

    if (!isHost(room.players, currentHostId)) {
      throw new PublicError("Seul l’hôte actuel peut transférer ce rôle.", 403);
    }

    const targetPlayer = room.players.find((player) => player.publicId === targetPlayerPublicId);
    if (!targetPlayer) throw new PublicError("Le nouvel hôte doit être un joueur de ce salon.");
    if (currentHostId === targetPlayer.id) throw new PublicError("Tu es déjà l’hôte de ce salon.");

    const updatedHost = await transaction.player.updateMany({
      where: { id: currentHostId, roomId: room.id, isHost: true },
      data: { isHost: false },
    });

    if (updatedHost.count !== 1) throw new PublicError("Le rôle d’hôte a déjà été transféré.", 409);

    await transaction.player.update({
      where: { id: targetPlayer.id },
      data: { isHost: true },
    });
  });
}

export async function kickPlayer(code: string, hostId: string, targetPlayerPublicId: string) {
  await runSerializable(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room || room.phase !== RoomPhase.LOBBY) {
      throw new PublicError("Un joueur peut être retiré uniquement avant le début de la partie.", 409);
    }
    if (!isHost(room.players, hostId)) {
      throw new PublicError("Seul l’hôte peut retirer un joueur du salon.", 403);
    }

    const targetPlayer = room.players.find((player) => player.publicId === targetPlayerPublicId);
    if (!targetPlayer) throw new PublicError("Ce joueur n’est plus dans le salon.", 404);
    if (targetPlayer.id === hostId) throw new PublicError("L’hôte ne peut pas se retirer lui-même ainsi.");

    await transaction.player.delete({ where: { id: targetPlayer.id } });
  });
}

export async function startGame(code: string, playerId: string) {
  await runSerializable(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });

    if (!room || !isHost(room.players, playerId)) throw new PublicError("Action non autorisée.", 403);
    if (room.phase !== RoomPhase.LOBBY || room.players.length < 3) {
      throw new PublicError("Il faut au moins trois joueurs pour démarrer.", 409);
    }
    if (room.impostorCount > room.players.length - 2) {
      throw new PublicError("Le nombre d’imposteurs est trop élevé.");
    }

    const availableWordPairs = await transaction.wordPair.findMany({
      where: { isActive: true },
      select: { id: true, civilianWord: true, impostorWord: true },
    });
    if (availableWordPairs.length < room.wordCount) {
      throw new PublicError("Il n’y a pas assez de paires de mots actives pour démarrer cette partie.", 409);
    }

    const selectedWordPairs = shuffle(availableWordPairs).slice(0, room.wordCount);
    const impostors = shuffle(room.players).slice(0, room.impostorCount);
    const turnEndsAt = new Date(Date.now() + room.turnSeconds * 1000);

    await transaction.player.updateMany({
      where: { roomId: room.id },
      data: { role: PlayerRole.CIVILIAN },
    });
    await Promise.all(impostors.map((player) => transaction.player.update({
      where: { id: player.id },
      data: { role: PlayerRole.IMPOSTOR },
    })));
    await transaction.roomWord.createMany({
      data: selectedWordPairs.map((wordPair, index) => {
        const reverseWords = randomInt(2) === 1;
        return {
          roomId: room.id,
          sourceWordPairId: wordPair.id,
          wordNumber: index + 1,
          civilianWord: reverseWords ? wordPair.impostorWord : wordPair.civilianWord,
          impostorWord: reverseWords ? wordPair.civilianWord : wordPair.impostorWord,
        };
      }),
    });
    await transaction.room.update({
      where: { id: room.id },
      data: {
        phase: RoomPhase.DISCUSSION,
        wordNumber: 1,
        roundNumber: 1,
        currentPlayerIndex: 0,
        turnEndsAt,
      },
    });
  });
}

async function advanceTurnWithClient(
  client: Prisma.TransactionClient,
  code: string,
  options: { force?: boolean; now?: Date; room?: RoomWithPlayers } = {},
) {
  const now = options.now ?? new Date();
  const room = options.room ?? (await client.room.findUnique({
    where: { code },
    include: { players: { orderBy: { createdAt: "asc" } } },
  }));

  if (
    !room ||
    room.phase !== RoomPhase.DISCUSSION ||
    !room.turnEndsAt ||
    !options.force && room.turnEndsAt > now
  ) {
    return { room, changed: false };
  }

  const nextIndex = room.currentPlayerIndex + 1;
  const completedRound = nextIndex >= room.players.length;
  const nextRound = completedRound ? room.roundNumber + 1 : room.roundNumber;
  const nextWord = completedRound && nextRound > room.roundCount ? room.wordNumber + 1 : room.wordNumber;

  if (nextWord > room.wordCount) {
    const updatedRoom = await client.room.update({
      where: { id: room.id },
      data: { phase: RoomPhase.VOTING, turnEndsAt: null },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });

    return { room: updatedRoom, changed: true };
  }

  const newRound = completedRound && nextRound > room.roundCount ? 1 : nextRound;
  const nextTurnStartedAt = options.force ? now : room.turnEndsAt;
  const updatedRoom = await client.room.update({
    where: { id: room.id },
    data: {
      currentPlayerIndex: completedRound ? 0 : nextIndex,
      roundNumber: newRound,
      wordNumber: nextWord,
      turnEndsAt: new Date(nextTurnStartedAt.getTime() + room.turnSeconds * 1000),
    },
    include: { players: { orderBy: { createdAt: "asc" } } },
  });

  return { room: updatedRoom, changed: true };
}

export async function getNextTurnExpiration() {
  const room = await prisma.room.findFirst({
    where: {
      phase: RoomPhase.DISCUSSION,
      turnEndsAt: { not: null },
    },
    orderBy: { turnEndsAt: "asc" },
    select: { code: true, turnEndsAt: true },
  });

  if (!room?.turnEndsAt) return null;

  return { code: room.code, endsAt: room.turnEndsAt };
}

export async function advanceExpiredTurn(code: string, now = new Date()) {
  return runSerializable(async (transaction) => {
    const { changed } = await advanceTurnWithClient(transaction, code, { now });
    return changed;
  });
}

export async function submitClue(code: string, playerId: string, content: string) {
  try {
    await runSerializable(async (transaction) => {
      const { room } = await advanceTurnWithClient(transaction, code);
      if (!room || room.phase !== RoomPhase.DISCUSSION || room.players[room.currentPlayerIndex]?.id !== playerId) {
        throw new PublicError("Ce n'est pas votre tour.", 409);
      }

      const normalizedContent = normalizeClueContent(content);
      if (!normalizedContent) {
        throw new PublicError("Saisis un mot contenant au moins une lettre ou un chiffre.");
      }

      await transaction.clue.create({
        data: {
          roomId: room.id,
          playerId,
          content: content.trim(),
          normalizedContent,
          wordNumber: room.wordNumber,
          roundNumber: room.roundNumber,
        },
      });
      await advanceTurnWithClient(transaction, code, { force: true, room });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PublicError("Ce mot a déjà été proposé pendant cette manche.", 409);
    }
    throw error;
  }
}

export async function beginVote(code: string, playerId: string) {
  await runSerializable(async (transaction) => {
    const { room } = await advanceTurnWithClient(transaction, code);
    if (!room || !isHost(room.players, playerId)) throw new PublicError("Action non autorisée.", 403);
    if (room.phase !== RoomPhase.DISCUSSION || room.roundNumber === 1 && room.wordNumber === 1) {
      throw new PublicError("Terminez au moins un tour complet avant le vote.", 409);
    }

    await transaction.room.update({
      where: { id: room.id },
      data: { phase: RoomPhase.VOTING, turnEndsAt: null },
    });
  });
}

async function finalizeVoteIfComplete(
  transaction: Prisma.TransactionClient,
  roomId: string,
  players: Array<{ id: string; role: PlayerRole }>,
) {
  const votes = await transaction.vote.findMany({ where: { roomId } });
  if (votes.length !== players.length || votes.length === 0) return;

  const totals = new Map<string, number>();
  votes.forEach((vote) => totals.set(vote.targetId, (totals.get(vote.targetId) ?? 0) + 1));
  const highestScore = Math.max(...totals.values());
  const mostVoted = new Set(
    [...totals].filter(([, score]) => score === highestScore).map(([targetId]) => targetId),
  );
  const civiliansWin = players.some(
    (player) => player.role === PlayerRole.IMPOSTOR && mostVoted.has(player.id),
  );

  await transaction.room.update({
    where: { id: roomId },
    data: { phase: RoomPhase.RESULTS, winner: civiliansWin ? "CIVILIANS" : "IMPOSTOR" },
  });
}

export async function castVote(code: string, voterId: string, targetPublicId: string) {
  try {
    await runSerializable(async (transaction) => {
      const room = await transaction.room.findUnique({
        where: { code },
        include: { players: true },
      });
      const voter = room?.players.find((player) => player.id === voterId);
      const target = room?.players.find((player) => player.publicId === targetPublicId);

      if (!room || room.phase !== RoomPhase.VOTING || !voter || !target) {
        throw new PublicError("Vote invalide.", 409);
      }
      if (voter.id === target.id) throw new PublicError("Vous ne pouvez pas voter pour vous-même.");

      await transaction.vote.create({
        data: { roomId: room.id, voterId: voter.id, targetId: target.id },
      });
      await finalizeVoteIfComplete(transaction, room.id, room.players);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PublicError("Votre vote a déjà été enregistré.", 409);
    }
    throw error;
  }
}

export async function getSnapshot(code: string, playerId: string): Promise<GameState | null> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      players: { orderBy: { createdAt: "asc" } },
      votes: { include: { voter: true, target: true } },
      clues: { include: { player: true }, orderBy: { createdAt: "asc" } },
      words: { orderBy: { wordNumber: "asc" } },
    },
  });
  const currentPlayer = room?.players.find((player) => player.id === playerId);
  if (!room || !currentPlayer) return null;

  const currentTurnPlayer = room.players[room.currentPlayerIndex];
  const currentWord = room.words.find((word) => word.wordNumber === room.wordNumber);

  return {
    code: room.code,
    phase: room.phase,
    settings: {
      wordCount: room.wordCount,
      roundCount: room.roundCount,
      turnSeconds: room.turnSeconds,
      impostorCount: room.impostorCount,
    },
    turn: room.phase === RoomPhase.DISCUSSION && room.turnEndsAt && currentTurnPlayer
      ? {
          wordNumber: room.wordNumber,
          roundNumber: room.roundNumber,
          currentPlayerPublicId: currentTurnPlayer.publicId,
          endsAt: room.turnEndsAt.toISOString(),
          canStartVote: room.roundNumber > 1 || room.wordNumber > 1,
        }
      : undefined,
    players: room.players.map((player) => ({
      publicId: player.publicId,
      name: player.name,
      isSelf: player.id === currentPlayer.id,
      isHost: player.isHost,
      hasVoted: room.votes.some((vote) => vote.voterId === player.id),
    })),
    currentPlayer: {
      name: currentPlayer.name,
      isHost: currentPlayer.isHost,
      word: room.phase === RoomPhase.LOBBY
        ? undefined
        : currentPlayer.role === PlayerRole.IMPOSTOR
          ? currentWord?.impostorWord
          : currentWord?.civilianWord,
    },
    clues: room.clues.map((clue) => ({
      playerPublicId: clue.player.publicId,
      content: clue.content,
      playerName: clue.player.name,
      wordNumber: clue.wordNumber,
      roundNumber: clue.roundNumber,
    })),
    votes: room.votes.map((vote) => ({
      voterPublicId: vote.voter.publicId,
      voterName: vote.voter.name,
      targetPublicId: vote.target.publicId,
      targetName: vote.target.name,
    })),
    winner: room.winner === "CIVILIANS" || room.winner === "IMPOSTOR" ? room.winner : undefined,
    result: room.phase === RoomPhase.RESULTS && currentWord && room.winner
      ? {
          impostorNames: room.players
            .filter((player) => player.role === PlayerRole.IMPOSTOR)
            .map((player) => player.name),
          civilianWord: currentWord.civilianWord,
          impostorWord: currentWord.impostorWord,
        }
      : undefined,
    endReason: room.phase === RoomPhase.RESULTS && !room.winner ? "NOT_ENOUGH_PLAYERS" : undefined,
  };
}
