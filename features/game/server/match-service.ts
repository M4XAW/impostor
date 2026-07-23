import { PlayerRole, Prisma, RoomPhase, WinnerTeam } from "@/generated/prisma/client";
import {
  assignMatchRoles,
  isRoomHost,
  normalizeClueContent,
  shouldReverseMatchWords,
  shuffle,
} from "@/features/game/server/game-helpers";
import {
  runGameTransaction,
  type GameTransaction,
} from "@/features/game/server/game-transaction";
import { PublicError } from "@/lib/errors";
import { assertGamePhaseTransition } from "@/lib/game-phase";
import {
  areAllRoomPlayersConnected,
  hasMinimumConnectedPlayers,
} from "@/lib/player-presence";
import { prisma } from "@/lib/prisma";
import { getNextTurnProgress } from "@/lib/turn-progress";
import { determineVoteOutcome } from "@/lib/vote-outcome";

export async function startGame(code: string, playerId: string) {
  await runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });

    if (!room || !isRoomHost(room, playerId)) {
      throw new PublicError("Action non autorisée.", 403);
    }
    if (room.phase !== RoomPhase.LOBBY || room.players.length < 3) {
      throw new PublicError("Il faut au moins trois joueurs pour démarrer.", 409);
    }
    const roomPlayerIds = room.players.map((player) => player.id);
    if (!hasMinimumConnectedPlayers(code, roomPlayerIds, 3)) {
      throw new PublicError("Il faut au moins trois joueurs connectés pour démarrer.", 409);
    }
    if (!areAllRoomPlayersConnected(code, roomPlayerIds)) {
      throw new PublicError("Tous les joueurs du salon doivent être connectés pour démarrer.", 409);
    }
    if (!room.players.every((player) => player.isReady)) {
      throw new PublicError("Tous les joueurs doivent être prêts pour démarrer.", 409);
    }
    if (room.impostorCount > room.players.length - 2) {
      throw new PublicError("Le nombre d’imposteurs est trop élevé.");
    }

    const availableWordPairs = await transaction.wordPair.findMany({
      where: { isActive: true },
      select: { id: true, civilianWord: true, impostorWord: true },
    });
    if (availableWordPairs.length < room.matchCount) {
      throw new PublicError(
        "Il n’y a pas assez de paires de mots actives pour démarrer cette partie.",
        409,
      );
    }

    const selectedWordPairs = shuffle(availableWordPairs).slice(0, room.matchCount);
    await assignMatchRoles(transaction, room.id, room.players, room.impostorCount);
    await transaction.matchWord.createMany({
      data: selectedWordPairs.map((wordPair, index) => {
        const reverseWords = shouldReverseMatchWords();
        return {
          roomId: room.id,
          sourceWordPairId: wordPair.id,
          matchNumber: index + 1,
          civilianWord: reverseWords ? wordPair.impostorWord : wordPair.civilianWord,
          impostorWord: reverseWords ? wordPair.civilianWord : wordPair.impostorWord,
        };
      }),
    });

    assertGamePhaseTransition(room.phase, RoomPhase.DISCUSSION);
    await transaction.room.update({
      where: { id: room.id },
      data: {
        phase: RoomPhase.DISCUSSION,
        matchNumber: 1,
        clueRoundNumber: 1,
        currentPlayerIndex: 0,
        turnEndsAt: new Date(Date.now() + room.turnSeconds * 1000),
      },
    });
  });
}

async function advanceTurnWithClient(
  client: GameTransaction,
  code: string,
  options: { force?: boolean; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const room = await client.room.findUnique({
    where: { code },
    include: { players: { orderBy: { createdAt: "asc" } } },
  });

  if (
    !room ||
    room.phase !== RoomPhase.DISCUSSION ||
    !room.turnEndsAt ||
    !options.force && room.turnEndsAt > now
  ) {
    return { room, changed: false };
  }

  const nextTurn = getNextTurnProgress({
    currentPlayerIndex: room.currentPlayerIndex,
    playerCount: room.players.length,
    clueRoundNumber: room.clueRoundNumber,
    clueRoundCount: room.clueRoundCount,
    matchNumber: room.matchNumber,
  });

  if (nextTurn.phase === "VOTING") {
    assertGamePhaseTransition(room.phase, RoomPhase.VOTING);
    const updatedRoom = await client.room.update({
      where: { id: room.id },
      data: { phase: RoomPhase.VOTING, turnEndsAt: null },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });
    return { room: updatedRoom, changed: true };
  }

  const nextTurnStartedAt = options.force ? now : room.turnEndsAt;
  const updatedRoom = await client.room.update({
    where: { id: room.id },
    data: {
      currentPlayerIndex: nextTurn.currentPlayerIndex,
      clueRoundNumber: nextTurn.clueRoundNumber,
      matchNumber: nextTurn.matchNumber,
      turnEndsAt: new Date(nextTurnStartedAt.getTime() + room.turnSeconds * 1000),
    },
    include: { players: { orderBy: { createdAt: "asc" } } },
  });
  return { room: updatedRoom, changed: true };
}

export async function getNextTurnExpiration() {
  const room = await prisma.room.findFirst({
    where: { phase: RoomPhase.DISCUSSION, turnEndsAt: { not: null } },
    orderBy: { turnEndsAt: "asc" },
    select: { code: true, turnEndsAt: true },
  });

  if (!room?.turnEndsAt) return null;
  return { code: room.code, endsAt: room.turnEndsAt };
}

export async function advanceExpiredTurn(code: string, now = new Date()) {
  return runGameTransaction(async (transaction) => {
    const { changed } = await advanceTurnWithClient(transaction, code, { now });
    return changed;
  });
}

export async function submitClue(code: string, playerId: string, content: string) {
  try {
    await runGameTransaction(async (transaction) => {
      const { room } = await advanceTurnWithClient(transaction, code);
      if (
        !room ||
        room.phase !== RoomPhase.DISCUSSION ||
        room.players[room.currentPlayerIndex]?.id !== playerId
      ) {
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
          matchNumber: room.matchNumber,
          clueRoundNumber: room.clueRoundNumber,
        },
      });
      await advanceTurnWithClient(transaction, code, { force: true });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PublicError("Ce mot a déjà été proposé pendant cette manche.", 409);
    }
    throw error;
  }
}

export async function beginVote(code: string, playerId: string) {
  await runGameTransaction(async (transaction) => {
    const { room } = await advanceTurnWithClient(transaction, code);
    if (!room || !isRoomHost(room, playerId)) {
      throw new PublicError("Action non autorisée.", 403);
    }
    if (room.phase !== RoomPhase.DISCUSSION || room.clueRoundNumber === 1) {
      throw new PublicError("Terminez au moins un tour complet avant le vote.", 409);
    }

    assertGamePhaseTransition(room.phase, RoomPhase.VOTING);
    await transaction.room.update({
      where: { id: room.id },
      data: { phase: RoomPhase.VOTING, turnEndsAt: null },
    });
  });
}

export async function startNextMatch(code: string, playerId: string) {
  await runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });

    if (!room || !isRoomHost(room, playerId)) {
      throw new PublicError("Action non autorisée.", 403);
    }
    if (room.phase !== RoomPhase.RESULTS || !room.matchWinner) {
      throw new PublicError("Terminez la manche en cours avant de continuer.", 409);
    }
    if (room.matchNumber >= room.matchCount) {
      throw new PublicError("Toutes les manches sont terminées.", 409);
    }
    if (room.players.length < 3) {
      throw new PublicError("Il faut au moins trois joueurs pour continuer.", 409);
    }

    await assignMatchRoles(transaction, room.id, room.players, room.impostorCount);
    assertGamePhaseTransition(room.phase, RoomPhase.DISCUSSION);
    await transaction.room.update({
      where: { id: room.id },
      data: {
        phase: RoomPhase.DISCUSSION,
        matchWinner: null,
        matchNumber: room.matchNumber + 1,
        clueRoundNumber: 1,
        currentPlayerIndex: 0,
        turnEndsAt: new Date(Date.now() + room.turnSeconds * 1000),
      },
    });
  });
}

export async function restartSeries(code: string, playerId: string) {
  await runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true, matchResults: true },
    });

    if (!room || !isRoomHost(room, playerId)) {
      throw new PublicError("Action non autorisée.", 403);
    }
    if (
      room.phase !== RoomPhase.RESULTS ||
      room.matchNumber < room.matchCount ||
      room.matchResults.length < room.matchCount
    ) {
      throw new PublicError("Terminez toutes les manches avant de proposer une revanche.", 409);
    }
    if (room.players.length < 3) {
      throw new PublicError("Il faut au moins trois joueurs pour rejouer.", 409);
    }

    assertGamePhaseTransition(room.phase, RoomPhase.LOBBY);
    await transaction.matchResult.deleteMany({ where: { roomId: room.id } });
    await transaction.vote.deleteMany({ where: { roomId: room.id } });
    await transaction.clue.deleteMany({ where: { roomId: room.id } });
    await transaction.matchWord.deleteMany({ where: { roomId: room.id } });
    await transaction.player.updateMany({
      where: { roomId: room.id },
      data: { role: PlayerRole.CIVILIAN, isReady: false },
    });
    await transaction.room.update({
      where: { id: room.id },
      data: {
        phase: RoomPhase.LOBBY,
        matchWinner: null,
        matchNumber: 1,
        clueRoundNumber: 1,
        currentPlayerIndex: 0,
        turnEndsAt: null,
      },
    });
  });
}

export async function finalizeVoteIfComplete(
  transaction: GameTransaction,
  room: { id: string; phase: RoomPhase; matchNumber: number },
  players: Array<{ id: string; publicId: string; name: string; role: PlayerRole }>,
) {
  const votes = await transaction.vote.findMany({
    where: { roomId: room.id, matchNumber: room.matchNumber },
  });
  if (votes.length !== players.length || votes.length === 0) return;

  const matchWord = await transaction.matchWord.findUnique({
    where: { roomId_matchNumber: { roomId: room.id, matchNumber: room.matchNumber } },
  });
  if (!matchWord) throw new Error("Current match word not found.");

  const totals = new Map<string, number>();
  votes.forEach((vote) => totals.set(vote.targetId, (totals.get(vote.targetId) ?? 0) + 1));
  const { winner, isTie } = determineVoteOutcome(players, votes);

  await transaction.matchResult.create({
    data: {
      roomId: room.id,
      matchNumber: room.matchNumber,
      winner,
      isVoteTie: isTie,
      civilianWord: matchWord.civilianWord,
      impostorWord: matchWord.impostorWord,
      playerResults: {
        create: players.map((player) => {
          const playerVote = votes.find((vote) => vote.voterId === player.id);
          const voteTarget = players.find((candidate) => candidate.id === playerVote?.targetId);
          return {
            playerPublicId: player.publicId,
            playerName: player.name,
            role: player.role,
            receivedVoteCount: totals.get(player.id) ?? 0,
            votedForImpostor: voteTarget?.role === PlayerRole.IMPOSTOR,
            isMatchWinner: player.role === PlayerRole.CIVILIAN
              ? winner === WinnerTeam.CIVILIANS
              : winner === WinnerTeam.IMPOSTORS,
          };
        }),
      },
    },
  });

  assertGamePhaseTransition(room.phase, RoomPhase.RESULTS);
  await transaction.room.update({
    where: { id: room.id },
    data: { phase: RoomPhase.RESULTS, matchWinner: winner },
  });
}

export async function castVote(code: string, voterId: string, targetPublicId: string) {
  try {
    await runGameTransaction(async (transaction) => {
      const room = await transaction.room.findUnique({
        where: { code },
        include: { players: true },
      });
      const voter = room?.players.find((player) => player.id === voterId);
      const target = room?.players.find((player) => player.publicId === targetPublicId);

      if (!room || room.phase !== RoomPhase.VOTING || !voter || !target) {
        throw new PublicError("Vote invalide.", 409);
      }
      if (voter.id === target.id) {
        throw new PublicError("Vous ne pouvez pas voter pour vous-même.");
      }

      await transaction.vote.create({
        data: {
          roomId: room.id,
          matchNumber: room.matchNumber,
          voterId: voter.id,
          targetId: target.id,
        },
      });
      await finalizeVoteIfComplete(transaction, room, room.players);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PublicError("Votre vote a déjà été enregistré.", 409);
    }
    throw error;
  }
}
