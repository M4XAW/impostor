import { PlayerRole, RoomPhase } from "@/generated/prisma/client";
import { selectVisibleMatchItems } from "@/lib/current-match";
import { prisma } from "@/lib/prisma";
import { buildSeriesSummary } from "@/lib/series-summary";
import type { GameState } from "@/types/game";

export async function getSnapshot(code: string, playerId: string): Promise<GameState | null> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      players: { orderBy: { createdAt: "asc" } },
      votes: true,
      clues: { include: { player: true }, orderBy: { createdAt: "asc" } },
      matchWords: { orderBy: { matchNumber: "asc" } },
      matchResults: {
        include: { playerResults: true },
        orderBy: { matchNumber: "asc" },
      },
    },
  });
  const currentPlayer = room?.players.find((player) => player.id === playerId);
  if (!room || !currentPlayer) return null;

  const currentTurnPlayer = room.players[room.currentPlayerIndex];
  const currentWord = room.matchWords.find((word) => word.matchNumber === room.matchNumber);
  const showAllMatches = room.phase === RoomPhase.RESULTS &&
    (!room.matchWinner || room.matchNumber >= room.matchCount);
  const visibleClues = selectVisibleMatchItems(
    room.clues,
    room.matchNumber,
    showAllMatches,
  );
  const currentMatchVotes = room.votes.filter(
    (vote) => vote.matchNumber === room.matchNumber,
  );
  const seriesSummary = buildSeriesSummary(room.matchResults);
  const currentMatchSummary = seriesSummary.matches.find(
    (matchSummary) => matchSummary.matchNumber === room.matchNumber,
  );
  const isSeriesComplete = room.phase === RoomPhase.RESULTS &&
    room.matchNumber >= room.matchCount &&
    room.matchResults.length >= room.matchCount;

  return {
    code: room.code,
    phase: room.phase,
    settings: {
      matchCount: room.matchCount,
      clueRoundCount: room.clueRoundCount,
      turnSeconds: room.turnSeconds,
      impostorCount: room.impostorCount,
    },
    turn: room.phase === RoomPhase.DISCUSSION && room.turnEndsAt && currentTurnPlayer
      ? {
          matchNumber: room.matchNumber,
          clueRoundNumber: room.clueRoundNumber,
          currentPlayerPublicId: currentTurnPlayer.publicId,
          endsAt: room.turnEndsAt.toISOString(),
          canStartVote: room.clueRoundNumber > 1,
        }
      : undefined,
    players: room.players.map((player) => ({
      publicId: player.publicId,
      name: player.name,
      isSelf: player.id === currentPlayer.id,
      isHost: player.id === room.hostId,
      isReady: player.isReady,
      hasVoted: currentMatchVotes.some((vote) => vote.voterId === player.id),
    })),
    currentPlayer: {
      name: currentPlayer.name,
      isHost: currentPlayer.id === room.hostId,
      word: room.phase === RoomPhase.LOBBY
        ? undefined
        : currentPlayer.role === PlayerRole.IMPOSTOR
          ? currentWord?.impostorWord
          : currentWord?.civilianWord,
    },
    clues: visibleClues.map((clue) => ({
      playerPublicId: clue.player.publicId,
      content: clue.content,
      playerName: clue.player.name,
      matchNumber: clue.matchNumber,
      clueRoundNumber: clue.clueRoundNumber,
    })),
    voteProgress: {
      submittedCount: currentMatchVotes.length,
      requiredCount: room.players.length,
    },
    matchWinner: room.matchWinner ?? undefined,
    result: room.phase === RoomPhase.RESULTS && currentMatchSummary && room.matchWinner
      ? {
          matchNumber: currentMatchSummary.matchNumber,
          isVoteTie: currentMatchSummary.isVoteTie,
          impostorNames: currentMatchSummary.impostorNames,
          civilianWord: currentMatchSummary.civilianWord,
          impostorWord: currentMatchSummary.impostorWord,
          voteResults: currentMatchSummary.voteResults,
        }
      : undefined,
    seriesSummary: isSeriesComplete ? seriesSummary : undefined,
    endReason: room.phase === RoomPhase.RESULTS && !room.matchWinner
      ? "NOT_ENOUGH_PLAYERS"
      : undefined,
  };
}
