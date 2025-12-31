import type { Game, GameSource } from '@/lib/domain/models/Game';

// ============================================
// FETCH OPTIONS
// ============================================

export interface FetchGamesOptions {
  /** Fetch games played after this date */
  since?: Date;
  /** Fetch games played before this date */
  until?: Date;
  /** Maximum number of games to fetch (ignored if fetchAll is true) */
  maxGames?: number;
  /** Fetch all games regardless of maxGames limit */
  fetchAll?: boolean;
}

// ============================================
// BASE CLIENT INTERFACE
// ============================================

export interface IChessClient {
  /** The source this client fetches from */
  readonly source: GameSource;
  
  /** Validate that a username exists on this platform */
  validateUser(username: string): Promise<boolean>;
  
  /** Fetch games for a user */
  fetchGames(username: string, options?: FetchGamesOptions): Promise<Game[]>;
}

// ============================================
// CHESS.COM API TYPES
// ============================================

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
  /** Player accuracies, if they were previously calculated via Game Review */
  accuracies?: {
    white: number;
    black: number;
  };
}

export interface ChessComGamesResponse {
  games: ChessComGame[];
}

// ============================================
// LICHESS API TYPES
// ============================================

/**
 * Lichess analysis data for a player
 */
export interface LichessAnalysis {
  inaccuracy: number;
  mistake: number;
  blunder: number;
  acpl: number;
  accuracy?: number;
}

export interface LichessPlayer {
  user?: {
    name: string;
    id: string;
  };
  rating: number;
  ratingDiff?: number;
  /** Analysis data (only present if game has been analyzed) */
  analysis?: LichessAnalysis;
}

/**
 * Lichess clock data
 */
export interface LichessClock {
  /** Initial time in seconds */
  initial: number;
  /** Increment in seconds */
  increment: number;
  /** Estimated total time for rating purposes */
  totalTime: number;
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
  /** Clock configuration */
  clock?: LichessClock;
  /** Time remaining per ply in centiseconds */
  clocks?: number[];
  /** Per-move analysis (only present if game has been analyzed and evals=true) */
  analysis?: Array<{
    eval?: number;
    mate?: number;
    best?: string;
    variation?: string;
    judgment?: {
      name: 'Inaccuracy' | 'Mistake' | 'Blunder';
      comment: string;
    };
  }>;
  /** Division markers for game phases (only present if game has been analyzed) */
  division?: {
    middle?: number;
    end?: number;
  };
}
