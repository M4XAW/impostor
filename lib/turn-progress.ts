interface TurnProgressInput {
  currentPlayerIndex: number;
  playerCount: number;
  clueRoundNumber: number;
  clueRoundCount: number;
  matchNumber: number;
}

export type NextTurnProgress =
  | { phase: "VOTING" }
  | {
      phase: "DISCUSSION";
      currentPlayerIndex: number;
      clueRoundNumber: number;
      matchNumber: number;
    };

export function getNextTurnProgress({
  currentPlayerIndex,
  playerCount,
  clueRoundNumber,
  clueRoundCount,
  matchNumber,
}: TurnProgressInput): NextTurnProgress {
  const isLastPlayer = currentPlayerIndex + 1 >= playerCount;

  if (!isLastPlayer) {
    return {
      phase: "DISCUSSION",
      currentPlayerIndex: currentPlayerIndex + 1,
      clueRoundNumber,
      matchNumber,
    };
  }

  const isLastRound = clueRoundNumber >= clueRoundCount;

  if (!isLastRound) {
    return {
      phase: "DISCUSSION",
      currentPlayerIndex: 0,
      clueRoundNumber: clueRoundNumber + 1,
      matchNumber,
    };
  }

  return { phase: "VOTING" };
}
