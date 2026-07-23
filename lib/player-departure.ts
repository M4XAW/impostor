import type { GamePhase } from "@/types/game";

export function shouldPreservePlayerAfterDeparture(
  phase: GamePhase,
  isFinalMatch: boolean,
  hasWinner: boolean,
) {
  return phase === "RESULTS" && (isFinalMatch || !hasWinner);
}

export function shouldEndGameAfterDeparture(
  phase: GamePhase,
  remainingPlayerCount: number,
) {
  return phase !== "LOBBY" && remainingPlayerCount < 3;
}
