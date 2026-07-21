import type { GamePhase } from "@/types/game";

export function shouldPreservePlayerAfterDeparture(phase: GamePhase) {
  return phase === "RESULTS";
}
