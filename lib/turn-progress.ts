interface TurnProgressInput {
  currentPlayerIndex: number;
  playerCount: number;
  roundNumber: number;
  roundCount: number;
  wordNumber: number;
}

export type NextTurnProgress =
  | { phase: "VOTING" }
  | {
      phase: "DISCUSSION";
      currentPlayerIndex: number;
      roundNumber: number;
      wordNumber: number;
    };

export function getNextTurnProgress({
  currentPlayerIndex,
  playerCount,
  roundNumber,
  roundCount,
  wordNumber,
}: TurnProgressInput): NextTurnProgress {
  const isLastPlayer = currentPlayerIndex + 1 >= playerCount;

  if (!isLastPlayer) {
    return {
      phase: "DISCUSSION",
      currentPlayerIndex: currentPlayerIndex + 1,
      roundNumber,
      wordNumber,
    };
  }

  const isLastRound = roundNumber >= roundCount;

  if (!isLastRound) {
    return {
      phase: "DISCUSSION",
      currentPlayerIndex: 0,
      roundNumber: roundNumber + 1,
      wordNumber,
    };
  }

  return { phase: "VOTING" };
}
