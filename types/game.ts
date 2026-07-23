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

export interface MatchSummary {
  matchNumber: number;
  winner: WinnerTeam;
  isVoteTie: boolean;
  civilianWord: string;
  impostorWord: string;
  impostorNames: string[];
  voteResults: VoteResult[];
}

export interface PlayerSeriesScore {
  playerPublicId: string;
  playerName: string;
  matchWins: number;
}

export interface SeriesAward {
  playerNames: string[];
  value: number;
}

export interface SeriesSummary {
  globalWinner: WinnerTeam | "DRAW";
  civilianMatchWins: number;
  impostorMatchWins: number;
  playerScores: PlayerSeriesScore[];
  bestDetective?: SeriesAward;
  stealthiestImpostor?: SeriesAward;
  matches: MatchSummary[];
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
  players: Array<{
    publicId: string;
    name: string;
    isSelf: boolean;
    isHost: boolean;
    isReady: boolean;
    hasVoted: boolean;
  }>;
  currentPlayer: { name: string; isHost: boolean; word?: string };
  clues: Array<{
    playerPublicId: string;
    content: string;
    playerName: string;
    matchNumber: number;
    clueRoundNumber: number;
  }>;
  voteProgress: { submittedCount: number; requiredCount: number };
  matchWinner?: WinnerTeam;
  result?: {
    matchNumber: number;
    isVoteTie: boolean;
    impostorNames: string[];
    civilianWord: string;
    impostorWord: string;
    voteResults: VoteResult[];
  };
  seriesSummary?: SeriesSummary;
  endReason?: "NOT_ENOUGH_PLAYERS";
}

export interface GameSnapshot extends GameState {
  serverTiming: ServerTiming;
}
