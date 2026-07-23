import { PublicError } from "@/lib/errors";
import type { GamePhase } from "@/types/game";

const allowedTransitions = {
  LOBBY: ["DISCUSSION"],
  DISCUSSION: ["VOTING", "RESULTS"],
  VOTING: ["RESULTS"],
  RESULTS: ["DISCUSSION", "LOBBY"],
} as const satisfies Record<GamePhase, readonly GamePhase[]>;

export function canTransitionGamePhase(currentPhase: GamePhase, nextPhase: GamePhase) {
  return (allowedTransitions[currentPhase] as readonly GamePhase[]).includes(nextPhase);
}

export function assertGamePhaseTransition(currentPhase: GamePhase, nextPhase: GamePhase) {
  if (canTransitionGamePhase(currentPhase, nextPhase)) return;

  throw new PublicError(
    `La transition ${currentPhase} vers ${nextPhase} n’est pas autorisée.`,
    409,
  );
}
