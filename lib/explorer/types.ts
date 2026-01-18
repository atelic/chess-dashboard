import type { GameResult, PlayerColor } from '@/lib/types';

/**
 * Statistics for a position or move in the explorer
 */
export interface ExplorerStats {
  /** Total games reaching this position/move */
  total: number;
  /** Games won by the player */
  wins: number;
  /** Games lost by the player */
  losses: number;
  /** Games drawn */
  draws: number;
  /** Win percentage (0-100) */
  winRate: number;
}

/**
 * Per-color statistics for filtering
 */
export interface ColorStats {
  white: ExplorerStats;
  black: ExplorerStats;
}

/**
 * A move option from a position in the explorer tree
 */
export interface ExplorerMove {
  /** Move in Standard Algebraic Notation (e.g., "e4", "Nf3") */
  san: string;
  /** Move in UCI notation (e.g., "e2e4", "g1f3") */
  uci: string;
  /** Position key after this move is played */
  targetPosition: string;
  /** Statistics for this specific move (aggregated) */
  stats: ExplorerStats;
  /** Per-color statistics for filtering */
  colorStats: ColorStats;
}

/**
 * A node (position) in the explorer tree
 */
export interface ExplorerNode {
  /** Unique key for this position (FEN-based hash) */
  positionKey: string;
  /** Full FEN string for this position */
  fen: string;
  /** Parent position key (null for starting position) */
  parent: string | null;
  /** Move that led to this position (SAN notation) */
  move: string | null;
  /** Move that led to this position (UCI notation) */
  moveUci: string | null;
  /** Available moves from this position with stats */
  children: ExplorerMove[];
  /** Aggregated statistics at this position */
  stats: ExplorerStats;
  /** Per-color statistics for filtering */
  colorStats: ColorStats;
  /** Depth in the tree (0 = starting position) */
  depth: number;
}

/**
 * The complete explorer tree
 */
export interface ExplorerTree {
  /** All positions indexed by position key */
  nodes: Map<string, ExplorerNode>;
  /** Key for the starting position */
  rootKey: string;
  /** Total games included in the tree */
  totalGames: number;
  /** Number of games without PGN data (excluded from tree) */
  gamesWithoutPgn: number;
}

/**
 * Options for building the explorer tree
 */
export interface BuildTreeOptions {
  /** Maximum depth to explore (in plies/half-moves). Default: 60 (30 full moves) */
  maxDepth?: number;
  /** Minimum games required at a position to include it. Default: 1 */
  minGames?: number;
  /** Only include games where player had this color. Default: both */
  perspective?: PlayerColor | 'both';
}

/**
 * A game with PGN data for tree building
 */
export interface GameWithPgn {
  id: string;
  pgn: string;
  result: GameResult;
  playerColor: PlayerColor;
}

/**
 * Result of parsing a PGN and extracting positions
 */
export interface ParsedGame {
  gameId: string;
  result: GameResult;
  playerColor: PlayerColor;
  /** Positions reached in the game, in order */
  positions: {
    fen: string;
    positionKey: string;
    move: string | null;
    moveUci: string | null;
    depth: number;
  }[];
}
