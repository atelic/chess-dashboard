// Core chess game types

export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical';
export type GameResult = 'win' | 'loss' | 'draw';
export type GameSource = 'chesscom' | 'lichess';
export type PlayerColor = 'white' | 'black';

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
