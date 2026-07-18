import { PlayerRole, RoomPhase } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { GameSnapshot } from "@/types/game";

const WORDS = ["Volcan", "Cinéma", "Pirate", "Boussole", "Piano", "Jungle", "Astronaute", "Chocolat", "Phare", "Désert", "Lune", "Train", "Fusée", "Montagne", "Océan", "Bibliothèque", "Robot", "Forêt", "Musée", "Tempête"];

export interface RoomSettings { wordCount: number; roundCount: number; turnSeconds: number; impostorCount: number; }

function randomWord(wordNumber: number) { return WORDS[(wordNumber - 1) % WORDS.length]; }
function isHost(players: Array<{ id: string; isHost: boolean }>, playerId: string) { return players.some((player) => player.id === playerId && player.isHost); }

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${Array.from(bytes.slice(0, 3), (byte) => alphabet[byte % alphabet.length]).join("")}-${Array.from(bytes.slice(3), (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export async function createRoom(name: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.room.create({ data: { code: createRoomCode(), players: { create: { name, isHost: true } } }, include: { players: true } });
    } catch { /* A collision is retried. */ }
  }
  throw new Error("Impossible de créer une partie pour le moment.");
}

export async function joinRoom(code: string, name: string) {
  const room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
  if (!room) throw new Error("Cette partie n'existe pas.");
  if (room.phase !== RoomPhase.LOBBY) throw new Error("Cette partie a déjà commencé.");
  if (room.players.length >= 10) throw new Error("Cette partie est complète.");
  return { room, player: await prisma.player.create({ data: { roomId: room.id, name } }) };
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
  const impostors = [...room.players].sort(() => Math.random() - 0.5).slice(0, room.impostorCount);
  const turnEndsAt = new Date(Date.now() + room.turnSeconds * 1000);
  await prisma.$transaction([
    prisma.player.updateMany({ where: { roomId: room.id }, data: { role: PlayerRole.CIVILIAN } }),
    ...impostors.map((player) => prisma.player.update({ where: { id: player.id }, data: { role: PlayerRole.IMPOSTOR } })),
    prisma.room.update({ where: { id: room.id }, data: { phase: RoomPhase.DISCUSSION, secretWord: randomWord(1), wordNumber: 1, roundNumber: 1, currentPlayerIndex: 0, turnEndsAt } }),
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
  return prisma.room.update({ where: { id: room.id }, data: { currentPlayerIndex: completedRound ? 0 : nextIndex, roundNumber: newRound, wordNumber: nextWord, secretWord: nextWord !== room.wordNumber ? randomWord(nextWord) : room.secretWord, turnEndsAt: new Date(Date.now() + room.turnSeconds * 1000) } });
}

export async function submitClue(code: string, playerId: string, content: string) {
  const room = await synchronizeTurn(code);
  const players = await prisma.player.findMany({ where: { roomId: room?.id }, orderBy: { createdAt: "asc" } });
  if (!room || room.phase !== RoomPhase.DISCUSSION || players[room.currentPlayerIndex]?.id !== playerId) throw new Error("Ce n'est pas votre tour.");
  await prisma.clue.create({ data: { roomId: room.id, playerId, content, wordNumber: room.wordNumber, roundNumber: room.roundNumber } });
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
}

export async function getSnapshot(code: string, playerId: string): Promise<GameSnapshot | null> {
  await synchronizeTurn(code);
  const room = await prisma.room.findUnique({ where: { code }, include: { players: { orderBy: { createdAt: "asc" } }, votes: { include: { voter: true, target: true } }, clues: { include: { player: true }, orderBy: { createdAt: "asc" } } } });
  const currentPlayer = room?.players.find((player) => player.id === playerId);
  if (!room || !currentPlayer) return null;
  const currentTurnPlayer = room.players[room.currentPlayerIndex];
  return { code: room.code, phase: room.phase, settings: { wordCount: room.wordCount, roundCount: room.roundCount, turnSeconds: room.turnSeconds, impostorCount: room.impostorCount }, turn: room.phase === RoomPhase.DISCUSSION && room.turnEndsAt && currentTurnPlayer ? { wordNumber: room.wordNumber, roundNumber: room.roundNumber, currentPlayerId: currentTurnPlayer.id, endsAt: room.turnEndsAt.toISOString(), canStartVote: room.roundNumber > 1 || room.wordNumber > 1 } : undefined, players: room.players.map((player) => ({ id: player.id, name: player.name, isHost: player.isHost, hasVoted: room.votes.some((vote) => vote.voterId === player.id) })), currentPlayer: { id: currentPlayer.id, name: currentPlayer.name, isHost: currentPlayer.isHost, role: room.phase === RoomPhase.LOBBY ? undefined : currentPlayer.role, word: room.phase === RoomPhase.LOBBY || currentPlayer.role === PlayerRole.IMPOSTOR ? undefined : room.secretWord ?? undefined }, clues: room.clues.map((clue) => ({ id: clue.id, content: clue.content, playerName: clue.player.name, wordNumber: clue.wordNumber, roundNumber: clue.roundNumber })), votes: room.votes.map((vote) => ({ voterName: vote.voter.name, targetName: vote.target.name })) };
}
