import { PlayerRole, RoomPhase } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { GameSnapshot } from "@/types/game";

const WORDS = ["Volcan", "Cinéma", "Pirate", "Boussole", "Piano", "Jungle", "Astronaute", "Chocolat"];

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${Array.from(bytes.slice(0, 3), (byte) => alphabet[byte % alphabet.length]).join("")}-${Array.from(bytes.slice(3), (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export async function createRoom(name: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createRoomCode();
    try {
      return await prisma.room.create({
        data: {
          code,
          players: { create: { name, isHost: true } },
        },
        include: { players: true },
      });
    } catch {
      // A code collision is retried; other database errors are retried only a few times.
    }
  }
  throw new Error("Impossible de créer une partie pour le moment.");
}

export async function joinRoom(code: string, name: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room) throw new Error("Cette partie n'existe pas.");
  if (room.phase !== RoomPhase.LOBBY) throw new Error("Cette partie a déjà commencé.");
  if (room.players.length >= 10) throw new Error("Cette partie est complète.");
  const player = await prisma.player.create({ data: { roomId: room.id, name } });
  return { room, player };
}

export async function startGame(code: string, playerId: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room || room.hostId !== playerId && !room.players.some((player) => player.id === playerId && player.isHost)) throw new Error("Action non autorisée.");
  if (room.phase !== RoomPhase.LOBBY || room.players.length < 3) throw new Error("Il faut au moins trois joueurs pour démarrer.");
  const imposter = room.players[Math.floor(Math.random() * room.players.length)];
  const secretWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  await prisma.$transaction([
    prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.DISCUSSION, secretWord } }),
    prisma.player.update({ where: { id: imposter.id }, data: { role: PlayerRole.IMPOSTOR } }),
  ]);
}

export async function beginVote(code: string, playerId: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room || !room.players.some((player) => player.id === playerId && player.isHost)) throw new Error("Action non autorisée.");
  if (room.phase !== RoomPhase.DISCUSSION) throw new Error("Le vote ne peut pas commencer maintenant.");
  await prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.VOTING } });
}

export async function castVote(code: string, voterId: string, targetId: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true, votes: true } });
  if (!room || room.phase !== RoomPhase.VOTING || !room.players.some((player) => player.id === voterId) || !room.players.some((player) => player.id === targetId)) throw new Error("Vote invalide.");
  await prisma.vote.upsert({ where: { roomId_voterId: { roomId: room.id, voterId } }, create: { roomId: room.id, voterId, targetId }, update: { targetId } });
  if (room.votes.length + 1 >= room.players.length) await resolveVotes(room.id);
}

async function resolveVotes(roomId: string) {
  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId }, include: { players: true, votes: true } });
  const tally = new Map<string, number>();
  room.votes.forEach((vote) => tally.set(vote.targetId, (tally.get(vote.targetId) ?? 0) + 1));
  const eliminatedId = [...tally.entries()].sort((first, second) => second[1] - first[1])[0]?.[0];
  const eliminated = room.players.find((player) => player.id === eliminatedId);
  await prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.RESULTS } });
  return eliminated?.role === PlayerRole.IMPOSTOR ? "CIVILIANS" : "IMPOSTOR";
}

export async function getSnapshot(code: string, playerId: string): Promise<GameSnapshot | null> {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true, votes: true } });
  const currentPlayer = room?.players.find((player) => player.id === playerId);
  if (!room || !currentPlayer) return null;
  const votes = new Set(room.votes.map((vote) => vote.voterId));
  return {
    code: room.code,
    phase: room.phase,
    players: room.players.map((player) => ({ id: player.id, name: player.name, isHost: player.isHost, hasVoted: votes.has(player.id) })),
    currentPlayer: { id: currentPlayer.id, name: currentPlayer.name, isHost: currentPlayer.isHost, role: room.phase === RoomPhase.LOBBY ? undefined : currentPlayer.role, word: room.phase === RoomPhase.LOBBY || currentPlayer.role === PlayerRole.IMPOSTOR ? undefined : room.secretWord ?? undefined },
    winner: room.phase === RoomPhase.RESULTS ? "IMPOSTOR" : undefined,
  };
}
