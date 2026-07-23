import { randomInt } from "node:crypto";
import { Prisma, RoomPhase } from "@/generated/prisma/client";
import {
  isRoomHost,
  playerSessionData,
} from "@/features/game/server/game-helpers";
import { runGameTransaction } from "@/features/game/server/game-transaction";
import { finalizeVoteIfComplete } from "@/features/game/server/match-service";
import { PublicError } from "@/lib/errors";
import { assertGamePhaseTransition } from "@/lib/game-phase";
import { shouldEndGameAfterDeparture } from "@/lib/player-departure";
import { prisma } from "@/lib/prisma";
import type { PlayerSessionCredential } from "@/lib/session-token";

const MAX_ROOM_CODE_ATTEMPTS = 5;
const MAX_PLAYERS = 6;
const STALE_LOBBY_PLAYER_MS = 2 * 60 * 1000;
const EXPIRED_ROOM_MS = 12 * 60 * 60 * 1000;

export interface RoomSettings {
  matchCount: number;
  clueRoundCount: number;
  turnSeconds: number;
  impostorCount: number;
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

  return runGameTransaction(async (transaction) => {
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

    if (room.hostId && stalePlayerIds.has(room.hostId)) {
      await transaction.room.update({
        where: { id: room.id },
        data: { hostId: remainingPlayers[0].id },
      });
    }

    return true;
  });
}

export async function createRoom(name: string, credential: PlayerSessionCredential) {
  await pruneExpiredRooms();

  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await runGameTransaction(async (transaction) => {
        const room = await transaction.room.create({ data: { code: createRoomCode() } });
        const host = await transaction.player.create({
          data: {
            roomId: room.id,
            name,
            ...playerSessionData(credential),
          },
        });

        return transaction.room.update({
          where: { id: room.id },
          data: { hostId: host.id },
          include: { players: true },
        });
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

  return runGameTransaction(async (transaction) => {
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
  return runGameTransaction(async (transaction) => {
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

    if (shouldEndGameAfterDeparture(room.phase, remainingPlayers.length)) {
      assertGamePhaseTransition(room.phase, RoomPhase.RESULTS);
      await transaction.room.update({
        where: { id: room.id },
        data: { phase: RoomPhase.RESULTS, matchWinner: null, turnEndsAt: null },
      });
      return false;
    }

    await transaction.player.delete({ where: { id: playerId } });

    if (room.hostId === departingPlayer.id) {
      await transaction.room.update({
        where: { id: room.id },
        data: { hostId: remainingPlayers[0].id },
      });
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
      await finalizeVoteIfComplete(transaction, room, remainingPlayers);
    }

    return true;
  });
}

export async function updateSettings(code: string, playerId: string, settings: RoomSettings) {
  await runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room || !isRoomHost(room, playerId) || room.phase !== RoomPhase.LOBBY) {
      throw new PublicError("Seul l'hôte peut modifier les paramètres avant le départ.", 403);
    }

    await transaction.room.update({ where: { id: room.id }, data: settings });
    await transaction.player.updateMany({
      where: { roomId: room.id },
      data: { isReady: false },
    });
  });
}

export async function updatePlayerReady(code: string, playerId: string, isReady: boolean) {
  await runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });
    const player = room?.players.find((candidate) => candidate.id === playerId);

    if (!room || room.phase !== RoomPhase.LOBBY || !player) {
      throw new PublicError("Le statut prêt ne peut être modifié que dans le salon.", 409);
    }

    await transaction.player.update({ where: { id: player.id }, data: { isReady } });
  });
}

export async function transferHost(
  code: string,
  currentHostId: string,
  targetPlayerPublicId: string,
) {
  await runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room || room.phase !== RoomPhase.LOBBY) {
      throw new PublicError("L’hôte peut être transféré uniquement avant le début de la partie.", 409);
    }
    if (!isRoomHost(room, currentHostId)) {
      throw new PublicError("Seul l’hôte actuel peut transférer ce rôle.", 403);
    }

    const targetPlayer = room.players.find((player) => player.publicId === targetPlayerPublicId);
    if (!targetPlayer) throw new PublicError("Le nouvel hôte doit être un joueur de ce salon.");
    if (currentHostId === targetPlayer.id) throw new PublicError("Tu es déjà l’hôte de ce salon.");

    const updatedRoom = await transaction.room.updateMany({
      where: { id: room.id, hostId: currentHostId },
      data: { hostId: targetPlayer.id },
    });

    if (updatedRoom.count !== 1) {
      throw new PublicError("Le rôle d’hôte a déjà été transféré.", 409);
    }
  });
}

export async function kickPlayer(code: string, hostId: string, targetPlayerPublicId: string) {
  return runGameTransaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room || room.phase !== RoomPhase.LOBBY) {
      throw new PublicError("Un joueur peut être retiré uniquement avant le début de la partie.", 409);
    }
    if (!isRoomHost(room, hostId)) {
      throw new PublicError("Seul l’hôte peut retirer un joueur du salon.", 403);
    }

    const targetPlayer = room.players.find((player) => player.publicId === targetPlayerPublicId);
    if (!targetPlayer) throw new PublicError("Ce joueur n’est plus dans le salon.", 404);
    if (targetPlayer.id === hostId) {
      throw new PublicError("L’hôte ne peut pas se retirer lui-même ainsi.");
    }

    await transaction.player.delete({ where: { id: targetPlayer.id } });
    return { publicId: targetPlayer.publicId, name: targetPlayer.name };
  });
}
