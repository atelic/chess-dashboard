import type {
  TimeClass,
  GameResult,
  GameSource,
  PlayerColor,
  TerminationType,
} from '@/lib/shared/types';

// ============================================
// INTERFACES
// ============================================

export interface Opening {
  eco: string;
  name: string;
}

export interface Opponent {
  username: string;
  rating: number;
}

/**
 * Clock/time data for a game.
 * Used for time management analysis.
 */
export interface ClockData {
  /** Starting time in seconds */
  initialTime: number;
  /** Increment per move in seconds */
  increment: number;
  /** Player's time remaining at game end (seconds) */
  timeRemaining?: number;
  /** Average seconds per move for the player */
  avgMoveTime?: number;
  /** Time spent per move in seconds (optional, for detailed analysis) */
  moveTimes?: number[];
}

/**
 * Analysis data for a game.
 * Either from Lichess server analysis or local Stockfish.
 */
export interface AnalysisData {
  /** Accuracy percentage 0-100 */
  accuracy?: number;
  /** Number of blunders (>200cp loss) */
  blunders: number;
  /** Number of mistakes (100-200cp loss) */
  mistakes: number;
  /** Number of inaccuracies (50-100cp loss) */
  inaccuracies: number;
  /** Average centipawn loss */
  acpl?: number;
  /** When the analysis was performed */
  analyzedAt?: Date;
}

/**
 * Game domain model.
 * Represents a single chess game from any platform.
 */
export interface Game {
  readonly id: string;
  readonly source: GameSource;
  readonly userId?: number;
  readonly playedAt: Date;
  readonly timeClass: TimeClass;
  readonly playerColor: PlayerColor;
  readonly result: GameResult;
  readonly opening: Opening;
  readonly opponent: Opponent;
  readonly playerRating: number;
  readonly termination: TerminationType;
  readonly moveCount: number;
  readonly ratingChange?: number;
  readonly rated: boolean;
  readonly gameUrl: string;
  /** Clock/time data for time management analysis */
  readonly clock?: ClockData;
  /** Analysis data (accuracy, blunders, etc.) */
  readonly analysis?: AnalysisData;
}

/**
 * Data required to create a new game (without auto-generated fields)
 */
export type CreateGameData = Omit<Game, 'id'> & { id?: string };

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a new Game object with proper defaults
 */
export function createGame(data: CreateGameData): Game {
  return {
    id: data.id || generateGameId(data),
    source: data.source,
    userId: data.userId,
    playedAt: data.playedAt,
    timeClass: data.timeClass,
    playerColor: data.playerColor,
    result: data.result,
    opening: data.opening,
    opponent: data.opponent,
    playerRating: data.playerRating,
    termination: data.termination,
    moveCount: data.moveCount,
    ratingChange: data.ratingChange,
    rated: data.rated,
    gameUrl: data.gameUrl,
    clock: data.clock,
    analysis: data.analysis,
  };
}

/**
 * Generate a unique game ID from game data
 */
function generateGameId(game: CreateGameData): string {
  // Use source + timestamp + opponent for uniqueness
  const timestamp = game.playedAt.getTime();
  const opponent = game.opponent.username.toLowerCase().slice(0, 10);
  return `${game.source}-${timestamp}-${opponent}`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the display name for a game source
 */
export function getSourceDisplayName(source: GameSource): string {
  return source === 'chesscom' ? 'Chess.com' : 'Lichess';
}

/**
 * Get the icon/emoji for a game result
 */
export function getResultIcon(result: GameResult): string {
  switch (result) {
    case 'win':
      return '✓';
    case 'loss':
      return '✗';
    case 'draw':
      return '½';
  }
}

/**
 * Get CSS color class for a result
 */
export function getResultColorClass(result: GameResult): string {
  switch (result) {
    case 'win':
      return 'text-green-400';
    case 'loss':
      return 'text-red-400';
    case 'draw':
      return 'text-zinc-400';
  }
}

/**
 * Format termination type for display
 */
export function formatTermination(termination: TerminationType): string {
  const labels: Record<TerminationType, string> = {
    checkmate: 'Checkmate',
    resignation: 'Resignation',
    timeout: 'Timeout',
    stalemate: 'Stalemate',
    insufficient: 'Insufficient Material',
    repetition: 'Repetition',
    agreement: 'Draw Agreement',
    abandoned: 'Abandoned',
    other: 'Other',
  };
  return labels[termination] || 'Unknown';
}

/**
 * Check if a game was won
 */
export function isWin(game: Game): boolean {
  return game.result === 'win';
}

/**
 * Check if a game was lost
 */
export function isLoss(game: Game): boolean {
  return game.result === 'loss';
}

/**
 * Check if a game was a draw
 */
export function isDraw(game: Game): boolean {
  return game.result === 'draw';
}

// Re-export types for convenience
export type { TimeClass, GameResult, GameSource, PlayerColor, TerminationType };
