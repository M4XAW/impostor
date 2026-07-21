import type { GamePhase } from "@/types/game";

export interface RoundRow {
  wordNumber: number;
  roundNumber: number;
}

interface BuildRoundRowsOptions {
  clues: readonly RoundRow[];
  phase: GamePhase;
  roundCount: number;
  showAllWords: boolean;
  turn?: RoundRow;
  resultWordNumber?: number;
}

export function buildRoundRows({
  clues,
  phase,
  roundCount,
  showAllWords,
  turn,
  resultWordNumber,
}: BuildRoundRowsOptions): RoundRow[] {
  const rowMap = new Map<string, RoundRow>();

  clues.forEach((clue) => {
    rowMap.set(`${clue.wordNumber}-${clue.roundNumber}`, {
      wordNumber: clue.wordNumber,
      roundNumber: clue.roundNumber,
    });
  });

  if (turn) {
    rowMap.set(`${turn.wordNumber}-${turn.roundNumber}`, turn);
  }

  const visibleWordNumbers = showAllWords
    ? new Set(clues.map((clue) => clue.wordNumber))
    : new Set([resultWordNumber ?? clues[0]?.wordNumber]);

  if (phase === "VOTING" || phase === "RESULTS") {
    visibleWordNumbers.forEach((wordNumber) => {
      if (wordNumber === undefined) return;

      for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
        rowMap.set(`${wordNumber}-${roundNumber}`, {
          wordNumber,
          roundNumber,
        });
      }
    });
  }

  return [...rowMap.values()].sort(
    (first, second) =>
      first.wordNumber - second.wordNumber ||
      first.roundNumber - second.roundNumber,
  );
}
