export type GamePhase = "LOBBY" | "DISCUSSION" | "VOTING" | "RESULTS";
export type GameRole = "CIVILIAN" | "IMPOSTOR";

export interface GameSnapshot {
  code: string;
  phase: GamePhase;
  settings: { wordCount: number; roundCount: number; turnSeconds: number; impostorCount: number };
  turn?: { wordNumber: number; roundNumber: number; currentPlayerId: string; endsAt: string; canStartVote: boolean };
  players: Array<{ id: string; name: string; isHost: boolean; hasVoted: boolean }>;
  currentPlayer: { id: string; name: string; isHost: boolean; role?: GameRole; word?: string };
  clues: Array<{ id: string; content: string; playerName: string; wordNumber: number; roundNumber: number }>;
  votes: Array<{ voterName: string; targetName: string }>;
  winner?: "CIVILIANS" | "IMPOSTOR";
}
