import { PlayerRole, WinnerTeam } from "@/generated/prisma/client";

interface VoteOutcomePlayer {
  id: string;
  role: PlayerRole;
}

interface VoteOutcomeVote {
  targetId: string;
}

export interface VoteOutcome {
  winner: WinnerTeam;
  mostVotedPlayerIds: string[];
  isTie: boolean;
}

export function determineVoteOutcome(
  players: readonly VoteOutcomePlayer[],
  votes: readonly VoteOutcomeVote[],
): VoteOutcome {
  const voteCounts = new Map<string, number>();

  votes.forEach((vote) => {
    voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) ?? 0) + 1);
  });

  const highestVoteCount = Math.max(0, ...voteCounts.values());
  const mostVotedPlayerIds = [...voteCounts.entries()]
    .filter(([, voteCount]) => voteCount === highestVoteCount)
    .map(([playerId]) => playerId);
  const isTie = mostVotedPlayerIds.length !== 1;
  const uniquelySelectedPlayer = isTie
    ? undefined
    : players.find((player) => player.id === mostVotedPlayerIds[0]);
  const winner = uniquelySelectedPlayer?.role === PlayerRole.IMPOSTOR
    ? WinnerTeam.CIVILIANS
    : WinnerTeam.IMPOSTORS;

  return { winner, mostVotedPlayerIds, isTie };
}
