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
}

export interface ChessComGamesResponse {
  games: ChessComGame[];
}

// ============================================
// LICHESS API TYPES
// ============================================

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
