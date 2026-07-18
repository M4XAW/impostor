export type GamePhase = "LOBBY" | "DISCUSSION" | "VOTING" | "RESULTS";
export type GameRole = "CIVILIAN" | "IMPOSTOR";

export interface GameSnapshot {
  code: string;
  phase: GamePhase;
  players: Array<{ id: string; name: string; isHost: boolean; hasVoted: boolean }>;
  currentPlayer: { id: string; name: string; isHost: boolean; role?: GameRole; word?: string };
  winner?: "CIVILIANS" | "IMPOSTOR";
}
