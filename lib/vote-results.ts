import type { VoteResult } from "@/types/game";

interface VoteResultPlayer {
  id: string;
  publicId: string;
  name: string;
}

interface VoteResultVote {
  targetId: string;
}

export function buildVoteResults(
  players: readonly VoteResultPlayer[],
  votes: readonly VoteResultVote[],
): VoteResult[] {
  const voteCounts = new Map<string, number>();

  votes.forEach((vote) => {
    voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) ?? 0) + 1);
  });

  const highestVoteCount = Math.max(0, ...voteCounts.values());

  return players
    .map((player) => {
      const voteCount = voteCounts.get(player.id) ?? 0;

      return {
        playerPublicId: player.publicId,
        playerName: player.name,
        voteCount,
        isMostVoted: highestVoteCount > 0 && voteCount === highestVoteCount,
      };
    })
    .sort((first, second) => second.voteCount - first.voteCount);
}
