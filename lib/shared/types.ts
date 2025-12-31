/**
 * Shared TypeScript types used across the application.
 * Domain-specific types are in lib/domain/models/
 */

// ============================================
// CHESS TYPES
// ============================================

export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical';
export type GameResult = 'win' | 'loss' | 'draw';
export type GameSource = 'chesscom' | 'lichess';
export type PlayerColor = 'white' | 'black';

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

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Makes specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

// ============================================
// API TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// DATE/TIME TYPES
// ============================================

export interface DateRange {
  start?: Date;
  end?: Date;
}

export interface RatingRange {
  min?: number;
  max?: number;
}
