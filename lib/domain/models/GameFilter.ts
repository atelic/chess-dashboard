import type {
  TimeClass,
  GameResult,
  GameSource,
  PlayerColor,
  TerminationType,
  DateRange,
  RatingRange,
} from '@/lib/shared/types';
import type { Game } from './Game';

/**
 * Immutable filter value object for querying games.
 * Use builder methods to create modified copies.
 */
export class GameFilter {
  private constructor(
    readonly timeClasses: readonly TimeClass[],
    readonly colors: readonly PlayerColor[],
    readonly results: readonly GameResult[],
    readonly sources: readonly GameSource[],
    readonly rated: boolean | null, // null = all, true = rated only, false = unrated only
    readonly dateRange: DateRange | null,
    readonly openings: readonly string[], // ECO codes
    readonly opponents: readonly string[],
    readonly opponentRatingRange: RatingRange | null,
    readonly terminations: readonly TerminationType[],
  ) {}

  // ============================================
  // FACTORY METHODS
  // ============================================

  /**
   * Create an empty filter (matches all games)
   */
  static empty(): GameFilter {
    return new GameFilter([], [], [], [], null, null, [], [], null, []);
  }

  /**
   * Create a filter from URL query parameters
   */
  static fromParams(params: Record<string, string | string[] | undefined>): GameFilter {
    return new GameFilter(
      parseStringArray(params.timeClasses) as TimeClass[],
      parseStringArray(params.colors) as PlayerColor[],
      parseStringArray(params.results) as GameResult[],
      parseStringArray(params.sources) as GameSource[],
      parseBoolean(params.rated),
      parseDateRange(params.startDate as string | undefined, params.endDate as string | undefined),
      parseStringArray(params.openings),
      parseStringArray(params.opponents),
      parseRatingRange(params.minRating as string | undefined, params.maxRating as string | undefined),
      parseStringArray(params.terminations) as TerminationType[],
    );
  }

  /**
   * Create a filter from a plain object (e.g., from JSON)
   */
  static fromObject(obj: Partial<GameFilterData>): GameFilter {
    return new GameFilter(
      obj.timeClasses || [],
      obj.colors || [],
      obj.results || [],
      obj.sources || [],
      obj.rated ?? null,
      obj.dateRange || null,
      obj.openings || [],
      obj.opponents || [],
      obj.opponentRatingRange || null,
      obj.terminations || [],
    );
  }

  // ============================================
  // BUILDER METHODS (return new instance)
  // ============================================

  withTimeClasses(timeClasses: TimeClass[]): GameFilter {
    return new GameFilter(
      timeClasses,
      this.colors,
      this.results,
      this.sources,
      this.rated,
      this.dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withColors(colors: PlayerColor[]): GameFilter {
    return new GameFilter(
      this.timeClasses,
      colors,
      this.results,
      this.sources,
      this.rated,
      this.dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withResults(results: GameResult[]): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      results,
      this.sources,
      this.rated,
      this.dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withSources(sources: GameSource[]): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      sources,
      this.rated,
      this.dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withRated(rated: boolean | null): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      this.sources,
      rated,
      this.dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withDateRange(dateRange: DateRange | null): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      this.sources,
      this.rated,
      dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withOpenings(openings: string[]): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      this.sources,
      this.rated,
      this.dateRange,
      openings,
      this.opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withOpponents(opponents: string[]): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      this.sources,
      this.rated,
      this.dateRange,
      this.openings,
      opponents,
      this.opponentRatingRange,
      this.terminations,
    );
  }

  withOpponentRatingRange(range: RatingRange | null): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      this.sources,
      this.rated,
      this.dateRange,
      this.openings,
      this.opponents,
      range,
      this.terminations,
    );
  }

  withTerminations(terminations: TerminationType[]): GameFilter {
    return new GameFilter(
      this.timeClasses,
      this.colors,
      this.results,
      this.sources,
      this.rated,
      this.dateRange,
      this.openings,
      this.opponents,
      this.opponentRatingRange,
      terminations,
    );
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Convert filter to URL query string
   */
  toQueryString(): string {
    const params = new URLSearchParams();

    if (this.timeClasses.length) params.set('timeClasses', this.timeClasses.join(','));
    if (this.colors.length) params.set('colors', this.colors.join(','));
    if (this.results.length) params.set('results', this.results.join(','));
    if (this.sources.length) params.set('sources', this.sources.join(','));
    if (this.rated !== null) params.set('rated', String(this.rated));
    if (this.dateRange?.start) params.set('startDate', this.dateRange.start.toISOString());
    if (this.dateRange?.end) params.set('endDate', this.dateRange.end.toISOString());
    if (this.openings.length) params.set('openings', this.openings.join(','));
    if (this.opponents.length) params.set('opponents', this.opponents.join(','));
    if (this.opponentRatingRange?.min !== undefined) params.set('minRating', String(this.opponentRatingRange.min));
    if (this.opponentRatingRange?.max !== undefined) params.set('maxRating', String(this.opponentRatingRange.max));
    if (this.terminations.length) params.set('terminations', this.terminations.join(','));

    return params.toString();
  }

  /**
   * Convert filter to plain object (for JSON serialization)
   */
  toJSON(): GameFilterData {
    return {
      timeClasses: [...this.timeClasses],
      colors: [...this.colors],
      results: [...this.results],
      sources: [...this.sources],
      rated: this.rated,
      dateRange: this.dateRange,
      openings: [...this.openings],
      opponents: [...this.opponents],
      opponentRatingRange: this.opponentRatingRange,
      terminations: [...this.terminations],
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if filter has any constraints
   */
  isEmpty(): boolean {
    return (
      this.timeClasses.length === 0 &&
      this.colors.length === 0 &&
      this.results.length === 0 &&
      this.sources.length === 0 &&
      this.rated === null &&
      this.dateRange === null &&
      this.openings.length === 0 &&
      this.opponents.length === 0 &&
      this.opponentRatingRange === null &&
      this.terminations.length === 0
    );
  }

  /**
   * Count the number of active filter criteria
   */
  activeCount(): number {
    let count = 0;
    if (this.timeClasses.length > 0) count++;
    if (this.colors.length > 0) count++;
    if (this.results.length > 0) count++;
    if (this.sources.length > 0) count++;
    if (this.rated !== null) count++;
    if (this.dateRange !== null) count++;
    if (this.openings.length > 0) count++;
    if (this.opponents.length > 0) count++;
    if (this.opponentRatingRange !== null) count++;
    if (this.terminations.length > 0) count++;
    return count;
  }

  /**
   * Apply filter to an array of games (client-side filtering)
   */
  apply(games: Game[]): Game[] {
    return games.filter((game) => this.matches(game));
  }

  /**
   * Check if a single game matches this filter
   */
  matches(game: Game): boolean {
    // Time class filter
    if (this.timeClasses.length > 0 && !this.timeClasses.includes(game.timeClass)) {
      return false;
    }

    // Color filter
    if (this.colors.length > 0 && !this.colors.includes(game.playerColor)) {
      return false;
    }

    // Result filter
    if (this.results.length > 0 && !this.results.includes(game.result)) {
      return false;
    }

    // Source filter
    if (this.sources.length > 0 && !this.sources.includes(game.source)) {
      return false;
    }

    // Rated filter
    if (this.rated !== null && game.rated !== this.rated) {
      return false;
    }

    // Date range filter
    if (this.dateRange) {
      if (this.dateRange.start && game.playedAt < this.dateRange.start) {
        return false;
      }
      if (this.dateRange.end && game.playedAt > this.dateRange.end) {
        return false;
      }
    }

    // Opening filter
    if (this.openings.length > 0 && !this.openings.includes(game.opening.eco)) {
      return false;
    }

    // Opponent filter
    if (this.opponents.length > 0) {
      const opponentLower = game.opponent.username.toLowerCase();
      if (!this.opponents.some((o) => o.toLowerCase() === opponentLower)) {
        return false;
      }
    }

    // Opponent rating range filter
    if (this.opponentRatingRange) {
      if (this.opponentRatingRange.min !== undefined && game.opponent.rating < this.opponentRatingRange.min) {
        return false;
      }
      if (this.opponentRatingRange.max !== undefined && game.opponent.rating > this.opponentRatingRange.max) {
        return false;
      }
    }

    // Termination filter
    if (this.terminations.length > 0 && !this.terminations.includes(game.termination)) {
      return false;
    }

    return true;
  }
}

// ============================================
// TYPES
// ============================================

/**
 * Plain object representation of GameFilter (for serialization)
 */
export interface GameFilterData {
  timeClasses: TimeClass[];
  colors: PlayerColor[];
  results: GameResult[];
  sources: GameSource[];
  rated: boolean | null;
  dateRange: DateRange | null;
  openings: string[];
  opponents: string[];
  opponentRatingRange: RatingRange | null;
  terminations: TerminationType[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseStringArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value.split(',').filter(Boolean);
}

function parseBoolean(value: string | string[] | undefined): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parseDateRange(start: string | undefined, end: string | undefined): DateRange | null {
  if (!start && !end) return null;
  return {
    start: start ? new Date(start) : undefined,
    end: end ? new Date(end) : undefined,
  };
}

function parseRatingRange(min: string | undefined, max: string | undefined): RatingRange | null {
  const minNum = min ? parseInt(min, 10) : undefined;
  const maxNum = max ? parseInt(max, 10) : undefined;
  if (minNum === undefined && maxNum === undefined) return null;
  return { min: minNum, max: maxNum };
}
