import type { GamePhase } from "@/types/game";

export function shouldEndGameAfterDeparture(
  phase: GamePhase,
  remainingPlayerCount: number,
) {
  return (phase === "DISCUSSION" || phase === "VOTING") && remainingPlayerCount < 3;
}
