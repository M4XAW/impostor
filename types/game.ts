export type GamePhase = "LOBBY" | "DISCUSSION" | "VOTING" | "RESULTS";
export type WinnerTeam = "CIVILIANS" | "IMPOSTORS";

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
  settings: {
    matchCount: number;
    clueRoundCount: number;
    turnSeconds: number;
    impostorCount: number;
  };
  turn?: {
    matchNumber: number;
    clueRoundNumber: number;
    currentPlayerPublicId: string;
    endsAt: string;
    canStartVote: boolean;
  };
  players: Array<{ publicId: string; name: string; isSelf: boolean; isHost: boolean; hasVoted: boolean }>;
  currentPlayer: { name: string; isHost: boolean; word?: string };
  clues: Array<{
    playerPublicId: string;
    content: string;
    playerName: string;
    matchNumber: number;
    clueRoundNumber: number;
  }>;
  votes: Array<{ voterPublicId: string; voterName: string; targetPublicId: string; targetName: string }>;
  matchWinner?: WinnerTeam;
  result?: {
    matchNumber: number;
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
