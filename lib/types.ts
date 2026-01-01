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

/**
 * Clock/time data for a game.
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
  termination: TerminationType;
  ratingChange?: number;        // +/- rating points (if available)
  moveCount: number;            // Number of moves in game
  rated: boolean;               // Whether the game was rated
  gameUrl: string;              // URL to view the game on the platform
  clock?: ClockData;            // Clock/time data for time management analysis
  analysis?: AnalysisData;      // Analysis data (accuracy, blunders, etc.)
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
  timeClass: TimeClass;
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

// Daily performance (by calendar date)
export interface DateStats {
  date: string;            // "2025-12-25"
  displayDate: string;     // "Dec 25, 2025"
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  ratingChange: number;    // Sum of rating changes for the day
  hasTilt: boolean;        // True if 3+ consecutive losses on this day
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
  rated: boolean | null;                           // null = all, true = rated only, false = unrated only
}

// ============================================
// TIME MANAGEMENT TYPES
// ============================================

/**
 * Overall time management statistics
 */
export interface TimeStats {
  /** Average time remaining at game end (seconds) */
  avgTimeRemaining: number;
  /** Percentage of losses that are timeouts */
  timeoutLossRate: number;
  /** Average seconds per move */
  avgMoveTime: number;
  /** Number of games with clock data */
  gamesWithClockData: number;
  /** Breakdown by time control */
  byTimeClass: TimeClassTimeStats[];
}

export interface TimeClassTimeStats {
  timeClass: TimeClass;
  games: number;
  avgTimeRemaining: number;
  timeoutRate: number;
  avgMoveTime: number;
}

/**
 * Time pressure analysis (games ending with low time)
 */
export interface TimePressureStats {
  /** Games ending with < 30 seconds */
  gamesInTimeTrouble: number;
  /** Win rate when in time trouble */
  winRateInTimeTrouble: number;
  /** Total losses to timeout */
  lossesToTimeout: number;
  /** Average time remaining in losses */
  avgTimeWhenLosing: number;
  /** Average time remaining in wins */
  avgTimeWhenWinning: number;
}

/**
 * Time usage by game phase
 */
export interface TimeUsageByPhase {
  /** Average time per move in moves 1-15 */
  openingAvgTime: number;
  /** Average time per move in moves 15-40 */
  middlegameAvgTime: number;
  /** Average time per move in moves 40+ */
  endgameAvgTime: number;
}

// ============================================
// TIME-OF-DAY PERFORMANCE TYPES
// ============================================

/**
 * Performance by hour of day
 */
export interface HourlyStats {
  hour: number;              // 0-23
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgRatingChange: number;
}

/**
 * Performance by day of week
 */
export interface DayOfWeekStats {
  day: number;               // 0=Sunday, 6=Saturday
  dayName: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

/**
 * A window of time (e.g., peak performance hours)
 */
export interface TimeWindow {
  startHour: number;
  endHour: number;
  winRate: number;
  games: number;
  label: string;             // e.g., "7pm-10pm"
}

/**
 * Heatmap data for time of day analysis
 */
export interface TimeHeatmapCell {
  day: number;               // 0-6 (Sunday-Saturday)
  hour: number;              // 0-23
  games: number;
  winRate: number;
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

// ============================================
// OPENING DEPTH ANALYSIS TYPES (Phase 5)
// ============================================

/**
 * Opening depth statistics for analysis
 */
export interface OpeningDepthStats {
  /** Average move number where player goes out of book */
  avgOutOfBookMove: number;
  /** Distribution of out-of-book moves by move number */
  outOfBookDistribution: { move: number; count: number }[];
  /** Openings where player stays in book longest */
  deepestOpenings: { eco: string; name: string; avgDepth: number; games: number }[];
  /** Openings where player deviates earliest */
  shallowOpenings: { eco: string; name: string; avgDepth: number; games: number }[];
  /** Overall book move percentage */
  bookMovePercentage: number;
  /** Games analyzed */
  gamesAnalyzed: number;
}

/**
 * Single game opening depth info
 */
export interface GameOpeningDepth {
  gameId: string;
  eco: string;
  openingName: string;
  bookMoves: number;
  outOfBookMove: number | null;
  firstNonBookMove: string | null;
  bookAlternative: string | null;
  result: GameResult;
}

// ============================================
// GAME PHASE ANALYSIS TYPES (Phase 6)
// ============================================

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/**
 * Performance statistics by game phase
 */
export interface GamePhaseStats {
  phase: GamePhase;
  /** Number of blunders in this phase */
  blunders: number;
  /** Number of mistakes in this phase */
  mistakes: number;
  /** Number of inaccuracies in this phase */
  inaccuracies: number;
  /** Average centipawn loss in this phase */
  avgCpLoss: number;
  /** Total moves analyzed in this phase */
  movesAnalyzed: number;
}

/**
 * Aggregated phase performance across games
 */
export interface PhasePerformanceSummary {
  opening: GamePhaseStats;
  middlegame: GamePhaseStats;
  endgame: GamePhaseStats;
  /** Which phase has the most issues */
  weakestPhase: GamePhase;
  /** Which phase is strongest */
  strongestPhase: GamePhase;
  /** Games with analysis data */
  gamesAnalyzed: number;
}

// ============================================
// RECOMMENDATION TYPES (Phase 7)
// ============================================

export type RecommendationType = 
  | 'opening_study'
  | 'time_control'
  | 'tactical_pattern'
  | 'endgame'
  | 'time_management'
  | 'mental_game';

export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * A personalized study recommendation
 */
export interface StudyRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  /** Specific items to study (e.g., opening names, endgame types) */
  studyItems: string[];
  /** Data supporting this recommendation */
  evidence: string;
  /** Optional link to external resource */
  resourceUrl?: string;
  /** Estimated impact on rating */
  estimatedImpact?: 'low' | 'medium' | 'high';
}

// ============================================
// RESILIENCE/COMEBACK TYPES (Phase 8)
// ============================================

/**
 * Evaluation swing in a game
 */
export interface EvalSwing {
  /** Move number where swing occurred */
  moveNumber: number;
  /** Evaluation before */
  evalBefore: number;
  /** Evaluation after */
  evalAfter: number;
  /** Magnitude of swing (absolute value) */
  magnitude: number;
  /** Direction: 'up' (toward player) or 'down' (against player) */
  direction: 'up' | 'down';
}

/**
 * Resilience statistics for a player
 */
export interface ResilienceStats {
  /** Games won from losing positions (eval < -150cp at some point) */
  comebackWins: number;
  /** Games lost from winning positions (eval > +150cp at some point) */
  blownWins: number;
  /** Comeback rate: comebackWins / games where player was losing */
  comebackRate: number;
  /** Blow rate: blownWins / games where player was winning */
  blowRate: number;
  /** Games with converted advantages (maintained + increased lead) */
  convertedAdvantages: number;
  /** Average largest deficit overcome in wins */
  avgDeficitOvercome: number;
  /** Average largest lead lost in losses */
  avgLeadLost: number;
  /** Games with significant eval swings */
  volatileGames: number;
  /** Mental game score (0-100): ability to handle pressure */
  mentalScore: number;
}

/**
 * Individual game resilience data
 */
export interface GameResilience {
  gameId: string;
  /** Largest eval disadvantage during the game */
  maxDeficit: number;
  /** Largest eval advantage during the game */
  maxAdvantage: number;
  /** Was this a comeback win? */
  isComeback: boolean;
  /** Was this a blown win? */
  isBlownWin: boolean;
  /** Number of significant eval swings */
  evalSwings: number;
  /** Game result */
  result: GameResult;
}
