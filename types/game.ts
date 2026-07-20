export type GamePhase = "LOBBY" | "DISCUSSION" | "VOTING" | "RESULTS";
export interface GameSnapshot {
  code: string;
  phase: GamePhase;
  settings: { wordCount: number; roundCount: number; turnSeconds: number; impostorCount: number };
  turn?: { wordNumber: number; roundNumber: number; currentPlayerId: string; endsAt: string; canStartVote: boolean };
  players: Array<{ id: string; name: string; isHost: boolean; hasVoted: boolean }>;
  currentPlayer: { id: string; name: string; isHost: boolean; word?: string };
  clues: Array<{ id: string; playerId: string; content: string; playerName: string; wordNumber: number; roundNumber: number }>;
  votes: Array<{ voterName: string; targetName: string }>;
  winner?: "CIVILIANS" | "IMPOSTOR";
  result?: {
    impostorNames: string[];
    civilianWord: string;
    impostorWord: string;
  };
  endReason?: "NOT_ENOUGH_PLAYERS";
}
