interface TurnProgressInput {
  currentPlayerIndex: number;
  playerCount: number;
  roundNumber: number;
  roundCount: number;
  wordNumber: number;
  wordCount: number;
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
  wordCount,
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

  if (wordNumber >= wordCount) {
    return { phase: "VOTING" };
  }

  return {
    phase: "DISCUSSION",
    currentPlayerIndex: 0,
    roundNumber: 1,
    wordNumber: wordNumber + 1,
  };
}
