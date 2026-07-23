import type { GamePhase } from "@/types/game";

export interface ClueRoundRow {
  matchNumber: number;
  clueRoundNumber: number;
}

interface BuildClueRoundRowsOptions {
  clues: readonly ClueRoundRow[];
  phase: GamePhase;
  clueRoundCount: number;
  showAllMatches: boolean;
  turn?: ClueRoundRow;
  resultMatchNumber?: number;
}

interface HasPlayerTurnElapsedOptions {
  phase: GamePhase;
  row: ClueRoundRow;
  turn?: ClueRoundRow;
  playerIndex: number;
  currentPlayerIndex: number;
}

export function hasPlayerTurnElapsed({
  phase,
  row,
  turn,
  playerIndex,
  currentPlayerIndex,
}: HasPlayerTurnElapsedOptions) {
  if (phase === "VOTING" || phase === "RESULTS") return true;
  if (phase !== "DISCUSSION" || !turn) return false;

  if (row.matchNumber !== turn.matchNumber) {
    return row.matchNumber < turn.matchNumber;
  }
  if (row.clueRoundNumber !== turn.clueRoundNumber) {
    return row.clueRoundNumber < turn.clueRoundNumber;
  }

  return playerIndex < currentPlayerIndex;
}

export function buildClueRoundRows({
  clues,
  phase,
  clueRoundCount,
  showAllMatches,
  turn,
  resultMatchNumber,
}: BuildClueRoundRowsOptions): ClueRoundRow[] {
  const rowMap = new Map<string, ClueRoundRow>();

  clues.forEach((clue) => {
    rowMap.set(`${clue.matchNumber}-${clue.clueRoundNumber}`, {
      matchNumber: clue.matchNumber,
      clueRoundNumber: clue.clueRoundNumber,
    });
  });

  if (turn) {
    rowMap.set(`${turn.matchNumber}-${turn.clueRoundNumber}`, turn);
  }

  const visibleMatchNumbers = showAllMatches
    ? new Set(clues.map((clue) => clue.matchNumber))
    : new Set([resultMatchNumber ?? clues[0]?.matchNumber]);

  if (phase === "VOTING" || phase === "RESULTS") {
    visibleMatchNumbers.forEach((matchNumber) => {
      if (matchNumber === undefined) return;

      for (let clueRoundNumber = 1; clueRoundNumber <= clueRoundCount; clueRoundNumber += 1) {
        rowMap.set(`${matchNumber}-${clueRoundNumber}`, {
          matchNumber,
          clueRoundNumber,
        });
      }
    });
  }

  return [...rowMap.values()].sort(
    (first, second) =>
      first.matchNumber - second.matchNumber ||
      first.clueRoundNumber - second.clueRoundNumber,
  );
}
