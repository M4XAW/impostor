export type GamePhase = "LOBBY" | "DISCUSSION" | "VOTING" | "RESULTS";

export interface ServerTiming {
  receivedAt: number;
  sentAt: number;
}

export interface VoteResult {
  playerPublicId: string;
  playerName: string;
  voteCount: number;
  isMostVoted: boolean;
}

export interface GameState {
  code: string;
  phase: GamePhase;
  settings: { wordCount: number; roundCount: number; turnSeconds: number; impostorCount: number };
  turn?: { wordNumber: number; roundNumber: number; currentPlayerPublicId: string; endsAt: string; canStartVote: boolean };
  players: Array<{ publicId: string; name: string; isSelf: boolean; isHost: boolean; hasVoted: boolean }>;
  currentPlayer: { name: string; isHost: boolean; word?: string };
  clues: Array<{ playerPublicId: string; content: string; playerName: string; wordNumber: number; roundNumber: number }>;
  votes: Array<{ voterPublicId: string; voterName: string; targetPublicId: string; targetName: string }>;
  winner?: "CIVILIANS" | "IMPOSTOR";
  result?: {
    impostorNames: string[];
    civilianWord: string;
    impostorWord: string;
    voteResults: VoteResult[];
  };
  endReason?: "NOT_ENOUGH_PLAYERS";
}

export interface GameSnapshot extends GameState {
  serverTiming: ServerTiming;
}
