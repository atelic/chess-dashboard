// Core chess game types

export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical';
export type GameResult = 'win' | 'loss' | 'draw';
export type GameSource = 'chesscom' | 'lichess';
export type PlayerColor = 'white' | 'black';

// Termination types - how games end
export type TerminationType =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'insufficient'
  | 'repetition'
  | 'agreement'
  | 'abandoned'
  | 'other';

export interface Opening {
  eco: string;    // e.g., "B08"
  name: string;   // e.g., "Pirc Defense"
}

export interface Opponent {
  username: string;
  rating: number;
}

export interface Game {
  id: string;
  source: GameSource;
  playedAt: Date;
  timeClass: TimeClass;
  playerColor: PlayerColor;
  result: GameResult;
  opening: Opening;
  opponent: Opponent;
  playerRating: number;
  // New fields
  termination: TerminationType;
  ratingChange?: number;        // +/- rating points (if available)
  moveCount: number;            // Number of moves in game
}

export interface FetchGamesOptions {
  startDate?: Date;
  endDate?: Date;
  maxGames?: number;  // default 100
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

// Chart data types
export interface WinRateDataPoint {
  week: string;        // "2025-W01" or date string
  winRate: number;     // 0-100
  games: number;       // count for tooltip
  wins: number;
  losses: number;
  draws: number;
}

export interface OpeningDataPoint {
  eco: string;         // "B08"
  name: string;        // "Pirc Defense" (most common name for this ECO)
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

export interface RatingDataPoint {
  date: string;        // ISO date
  rating: number;
  source: GameSource;
}

export interface TimeControlDataPoint {
  timeClass: TimeClass;
  count: number;
  percentage: number;
}

export interface ColorPerformanceDataPoint {
  color: 'white' | 'black';
  winRate: number;
  games: number;
  wins: number;
}

// New data structures for insights

// Opening stats by color
export interface OpeningByColorStats {
  eco: string;
  name: string;
  color: PlayerColor;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgOpponentRating: number;
}

// Opponent statistics
export interface OpponentStats {
  username: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgRating: number;
  lastPlayed: Date;
}

// Rating bracket performance
export interface RatingBracketStats {
  bracket: string;           // "1200-1400"
  minRating: number;
  maxRating: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

// Streak information
export interface StreakInfo {
  type: 'win' | 'loss';
  count: number;
  startDate: Date;
  endDate: Date;
}

// Termination statistics
export interface TerminationStats {
  termination: TerminationType;
  label: string;
  asWinner: number;
  asLoser: number;
  total: number;
}

// Insight card data
export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  icon: string;
  title: string;
  description: string;
  value?: string | number;
}

// Filter state
export interface FilterState {
  dateRange: { start?: Date; end?: Date };
  maxGames: number;
  timeClasses: TimeClass[];
  colors: PlayerColor[];
  results: GameResult[];
  openings: string[];                              // ECO codes
  opponentRatingRange: { min?: number; max?: number };
  opponents: string[];                             // Usernames
  terminations: TerminationType[];
  sources: GameSource[];
}

// API response types for Chess.com
export interface ChessComArchivesResponse {
  archives: string[];
}

export interface ChessComPlayer {
  rating: number;
  result: string;
  '@id': string;
  username: string;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: string;
  rules: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
  eco?: string;
}

export interface ChessComGamesResponse {
  games: ChessComGame[];
}

// API response types for Lichess
export interface LichessPlayer {
  user?: {
    name: string;
    id: string;
  };
  rating: number;
  ratingDiff?: number;
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
  winner?: 'white' | 'black';
  opening?: {
    eco: string;
    name: string;
    ply: number;
  };
  moves?: string;
  pgn?: string;
}
