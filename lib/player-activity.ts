export type PlayerActivityType = "joined" | "left";

export interface PlayerActivityEvent {
  type: PlayerActivityType;
  playerPublicId: string;
  playerName: string;
}

export function isPlayerActivityEvent(value: unknown): value is PlayerActivityEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value.type === "joined" || value.type === "left") &&
    "playerPublicId" in value &&
    typeof value.playerPublicId === "string" &&
    "playerName" in value &&
    typeof value.playerName === "string"
  );
}
