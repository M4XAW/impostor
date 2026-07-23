import type {
  MatchSummary,
  PlayerSeriesScore,
  SeriesAward,
  SeriesSummary,
  WinnerTeam,
} from "@/types/game";

interface StoredPlayerResult {
  playerPublicId: string;
  playerName: string;
  role: "CIVILIAN" | "IMPOSTOR";
  receivedVoteCount: number;
  votedForImpostor: boolean;
  isMatchWinner: boolean;
}

interface StoredMatchResult {
  matchNumber: number;
  winner: WinnerTeam;
  isVoteTie: boolean;
  civilianWord: string;
  impostorWord: string;
  playerResults: readonly StoredPlayerResult[];
}

interface AwardAccumulator {
  playerName: string;
  total: number;
  appearances: number;
}

function selectHighestAward(
  accumulators: ReadonlyMap<string, AwardAccumulator>,
): SeriesAward | undefined {
  const entries = [...accumulators.values()];
  const highestValue = Math.max(0, ...entries.map((entry) => entry.total));
  if (highestValue === 0) return undefined;

  return {
    playerNames: entries
      .filter((entry) => entry.total === highestValue)
      .map((entry) => entry.playerName)
      .sort((first, second) => first.localeCompare(second, "fr")),
    value: highestValue,
  };
}

function selectLowestAverageAward(
  accumulators: ReadonlyMap<string, AwardAccumulator>,
): SeriesAward | undefined {
  const entries = [...accumulators.values()];
  if (entries.length === 0) return undefined;

  const lowestAverage = Math.min(
    ...entries.map((entry) => entry.total / entry.appearances),
  );

  return {
    playerNames: entries
      .filter((entry) => entry.total / entry.appearances === lowestAverage)
      .map((entry) => entry.playerName)
      .sort((first, second) => first.localeCompare(second, "fr")),
    value: lowestAverage,
  };
}

function buildMatchSummary(matchResult: StoredMatchResult): MatchSummary {
  const highestVoteCount = Math.max(
    0,
    ...matchResult.playerResults.map((playerResult) => playerResult.receivedVoteCount),
  );

  return {
    matchNumber: matchResult.matchNumber,
    winner: matchResult.winner,
    isVoteTie: matchResult.isVoteTie,
    civilianWord: matchResult.civilianWord,
    impostorWord: matchResult.impostorWord,
    impostorNames: matchResult.playerResults
      .filter((playerResult) => playerResult.role === "IMPOSTOR")
      .map((playerResult) => playerResult.playerName),
    voteResults: matchResult.playerResults
      .map((playerResult) => ({
        playerPublicId: playerResult.playerPublicId,
        playerName: playerResult.playerName,
        voteCount: playerResult.receivedVoteCount,
        isMostVoted: highestVoteCount > 0 && playerResult.receivedVoteCount === highestVoteCount,
      }))
      .sort((first, second) => second.voteCount - first.voteCount),
  };
}

export function buildSeriesSummary(
  storedMatchResults: readonly StoredMatchResult[],
): SeriesSummary {
  const playerScores = new Map<string, PlayerSeriesScore>();
  const detectiveScores = new Map<string, AwardAccumulator>();
  const impostorDiscretion = new Map<string, AwardAccumulator>();

  storedMatchResults.forEach((matchResult) => {
    matchResult.playerResults.forEach((playerResult) => {
      const currentScore = playerScores.get(playerResult.playerPublicId) ?? {
        playerPublicId: playerResult.playerPublicId,
        playerName: playerResult.playerName,
        matchWins: 0,
      };
      if (playerResult.isMatchWinner) currentScore.matchWins += 1;
      playerScores.set(playerResult.playerPublicId, currentScore);

      if (playerResult.role === "CIVILIAN") {
        const detectiveScore = detectiveScores.get(playerResult.playerPublicId) ?? {
          playerName: playerResult.playerName,
          total: 0,
          appearances: 0,
        };
        detectiveScore.appearances += 1;
        if (playerResult.votedForImpostor) detectiveScore.total += 1;
        detectiveScores.set(playerResult.playerPublicId, detectiveScore);
      } else {
        const discretionScore = impostorDiscretion.get(playerResult.playerPublicId) ?? {
          playerName: playerResult.playerName,
          total: 0,
          appearances: 0,
        };
        discretionScore.total += playerResult.receivedVoteCount;
        discretionScore.appearances += 1;
        impostorDiscretion.set(playerResult.playerPublicId, discretionScore);
      }
    });
  });

  const civilianMatchWins = storedMatchResults.filter(
    (matchResult) => matchResult.winner === "CIVILIANS",
  ).length;
  const impostorMatchWins = storedMatchResults.length - civilianMatchWins;

  return {
    globalWinner: civilianMatchWins === impostorMatchWins
      ? "DRAW"
      : civilianMatchWins > impostorMatchWins
        ? "CIVILIANS"
        : "IMPOSTORS",
    civilianMatchWins,
    impostorMatchWins,
    playerScores: [...playerScores.values()].sort(
      (first, second) => second.matchWins - first.matchWins ||
        first.playerName.localeCompare(second.playerName, "fr"),
    ),
    bestDetective: selectHighestAward(detectiveScores),
    stealthiestImpostor: selectLowestAverageAward(impostorDiscretion),
    matches: storedMatchResults
      .map(buildMatchSummary)
      .sort((first, second) => first.matchNumber - second.matchNumber),
  };
}
