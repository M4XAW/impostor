import type { GamePhase } from "@/types/game";

export function shouldPreservePlayerAfterDeparture(
  phase: GamePhase,
  isFinalMatch: boolean,
) {
  return phase === "RESULTS" && isFinalMatch;
}
