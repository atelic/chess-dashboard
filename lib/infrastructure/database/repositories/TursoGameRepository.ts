import type { IGameRepository, PaginationOptions, PaginatedResult } from '@/lib/domain/repositories/interfaces';
import type { Game, GameSource, PlayerColor, ClockData, AnalysisData } from '@/lib/domain/models/Game';
import type { GameFilter } from '@/lib/domain/models/GameFilter';
import type { TursoClient } from '../client';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

/**
 * Explicit column list for SELECT queries to avoid SELECT *
 * Must match GameRow interface properties (snake_case DB columns)
 */
const GAME_SELECT_COLUMNS = `
  id, user_id, source, played_at, time_class, player_color, result,
  opening_eco, opening_name, opponent_username, opponent_rating,
  player_rating, termination, rating_change, move_count, rated, game_url,
  initial_time, increment, time_remaining, avg_move_time,
  accuracy, blunders, mistakes, inaccuracies, acpl, analyzed_at
`.replace(/\s+/g, ' ').trim();

/**
 * Database row type for games table
 */
interface GameRow {
  id: string;
  user_id: number;
  source: string;
  played_at: string;
  time_class: string;
  player_color: string;
  result: string;
  opening_eco: string | null;
  opening_name: string | null;
  opponent_username: string | null;
  opponent_rating: number | null;
  player_rating: number | null;
  termination: string | null;
  rating_change: number | null;
  move_count: number | null;
  rated: number;
  game_url: string | null;
  // Clock data
  initial_time: number | null;
  increment: number | null;
  time_remaining: number | null;
  avg_move_time: number | null;
  // Analysis data
  accuracy: number | null;
  blunders: number | null;
  mistakes: number | null;
  inaccuracies: number | null;
  acpl: number | null;
  analyzed_at: string | null;
}

/**
 * Turso implementation of IGameRepository
 */
export class TursoGameRepository implements IGameRepository {
  constructor(private readonly db: TursoClient) {}

  // ============================================
  // QUERIES
  // ============================================

  async findAll(userId: number, filter?: GameFilter, pagination?: PaginationOptions): Promise<Game[]> {
    let sql = `SELECT ${GAME_SELECT_COLUMNS} FROM games WHERE user_id = ?`;
    const params: unknown[] = [userId];

    if (filter && !filter.isEmpty()) {
      const { whereClauses, whereParams } = this.buildWhereClause(filter);
      if (whereClauses.length > 0) {
        sql += ' AND ' + whereClauses.join(' AND ');
        params.push(...whereParams);
      }
    }

    sql += ' ORDER BY played_at DESC';

    if (pagination) {
      const limit = Math.min(pagination.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
      const offset = pagination.offset ?? 0;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const rows = await this.db.query<GameRow>(sql, params);
    return rows.map((row) => this.rowToGame(row));
  }

  async findPaginated(userId: number, filter?: GameFilter, pagination?: PaginationOptions): Promise<PaginatedResult<Game>> {
    const limit = Math.min(pagination?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = pagination?.offset ?? 0;

    const [games, total] = await Promise.all([
      this.findAll(userId, filter, { limit, offset }),
      this.count(userId, filter),
    ]);

    return {
      data: games,
      total,
      limit,
      offset,
      hasMore: offset + games.length < total,
    };
  }

  async findById(id: string): Promise<Game | null> {
    const rows = await this.db.query<GameRow>(
      `SELECT ${GAME_SELECT_COLUMNS} FROM games WHERE id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToGame(rows[0]);
  }

  async findByIds(ids: string[]): Promise<Game[]> {
    if (ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this.db.query<GameRow>(
      `SELECT ${GAME_SELECT_COLUMNS} FROM games WHERE id IN (${placeholders}) ORDER BY played_at DESC`,
      ids,
    );

    return rows.map((row) => this.rowToGame(row));
  }

  async findByEco(userId: number, eco: string, color?: PlayerColor): Promise<Game[]> {
    let sql = `SELECT ${GAME_SELECT_COLUMNS} FROM games WHERE user_id = ? AND opening_eco = ?`;
    const params: unknown[] = [userId, eco];

    if (color) {
      sql += ' AND player_color = ?';
      params.push(color);
    }

    sql += ' ORDER BY played_at DESC';

    const rows = await this.db.query<GameRow>(sql, params);
    return rows.map((row) => this.rowToGame(row));
  }

  async findByOpponent(userId: number, opponent: string): Promise<Game[]> {
    const rows = await this.db.query<GameRow>(
      `SELECT ${GAME_SELECT_COLUMNS} FROM games 
       WHERE user_id = ? AND LOWER(opponent_username) = LOWER(?)
       ORDER BY played_at DESC`,
      [userId, opponent],
    );

    return rows.map((row) => this.rowToGame(row));
  }

  async count(userId: number, filter?: GameFilter): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM games WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (filter && !filter.isEmpty()) {
      const { whereClauses, whereParams } = this.buildWhereClause(filter);
      if (whereClauses.length > 0) {
        sql += ' AND ' + whereClauses.join(' AND ');
        params.push(...whereParams);
      }
    }

    const rows = await this.db.query<{ count: number }>(sql, params);
    return rows[0].count;
  }

  async existsById(id: string): Promise<boolean> {
    const rows = await this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM games WHERE id = ?',
      [id],
    );
    return rows[0].count > 0;
  }

  async getLatestGameDate(userId: number, source: GameSource): Promise<Date | null> {
    const rows = await this.db.query<{ played_at: string }>(
      `SELECT played_at FROM games 
       WHERE user_id = ? AND source = ?
       ORDER BY played_at DESC LIMIT 1`,
      [userId, source],
    );

    if (rows.length === 0) {
      return null;
    }

    return new Date(rows[0].played_at);
  }

  /**
   * Find games that don't have analysis data yet
   */
  async findGamesNeedingAnalysis(userId: number, limit: number = 50): Promise<Game[]> {
    const rows = await this.db.query<GameRow>(
      `SELECT ${GAME_SELECT_COLUMNS} FROM games 
       WHERE user_id = ? AND analyzed_at IS NULL
       ORDER BY played_at DESC
       LIMIT ?`,
      [userId, limit],
    );

    return rows.map((row) => this.rowToGame(row));
  }

  /**
   * Update analysis data for a game
   */
  async updateAnalysis(
    gameId: string,
    analysis: AnalysisData
  ): Promise<void> {
    await this.db.execute(
      `UPDATE games SET 
        accuracy = ?,
        blunders = ?,
        mistakes = ?,
        inaccuracies = ?,
        acpl = ?,
        analyzed_at = ?
       WHERE id = ?`,
      [
        analysis.accuracy ?? null,
        analysis.blunders,
        analysis.mistakes,
        analysis.inaccuracies,
        analysis.acpl ?? null,
        new Date().toISOString(),
        gameId,
      ],
    );
  }

  // ============================================
  // MUTATIONS
  // ============================================

  async save(game: Game & { userId: number }): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO games (
        id, user_id, source, played_at, time_class, player_color, result,
        opening_eco, opening_name, opponent_username, opponent_rating,
        player_rating, termination, rating_change, move_count, rated, game_url,
        initial_time, increment, time_remaining, avg_move_time,
        accuracy, blunders, mistakes, inaccuracies, acpl, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.id,
        game.userId,
        game.source,
        game.playedAt.toISOString(),
        game.timeClass,
        game.playerColor,
        game.result,
        game.opening.eco,
        game.opening.name,
        game.opponent.username,
        game.opponent.rating,
        game.playerRating,
        game.termination,
        game.ratingChange ?? null,
        game.moveCount,
        game.rated ? 1 : 0,
        game.gameUrl,
        game.clock?.initialTime ?? null,
        game.clock?.increment ?? null,
        game.clock?.timeRemaining ?? null,
        game.clock?.avgMoveTime ?? null,
        game.analysis?.accuracy ?? null,
        game.analysis?.blunders ?? null,
        game.analysis?.mistakes ?? null,
        game.analysis?.inaccuracies ?? null,
        game.analysis?.acpl ?? null,
        game.analysis?.analyzedAt?.toISOString() ?? null,
      ],
    );
  }

  async saveMany(games: (Game & { userId: number })[]): Promise<number> {
    if (games.length === 0) {
      return 0;
    }

    const statements = games.map((game) => ({
      sql: `INSERT INTO games (
        id, user_id, source, played_at, time_class, player_color, result,
        opening_eco, opening_name, opponent_username, opponent_rating,
        player_rating, termination, rating_change, move_count, rated, game_url,
        initial_time, increment, time_remaining, avg_move_time,
        accuracy, blunders, mistakes, inaccuracies, acpl, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        -- Clock data: preserve existing (static per game)
        initial_time = COALESCE(games.initial_time, excluded.initial_time),
        increment = COALESCE(games.increment, excluded.increment),
        time_remaining = COALESCE(games.time_remaining, excluded.time_remaining),
        avg_move_time = COALESCE(games.avg_move_time, excluded.avg_move_time),
        -- Analysis data: prefer new data (re-analysis may have updated results)
        accuracy = COALESCE(excluded.accuracy, games.accuracy),
        blunders = COALESCE(excluded.blunders, games.blunders),
        mistakes = COALESCE(excluded.mistakes, games.mistakes),
        inaccuracies = COALESCE(excluded.inaccuracies, games.inaccuracies),
        acpl = COALESCE(excluded.acpl, games.acpl),
        analyzed_at = COALESCE(excluded.analyzed_at, games.analyzed_at)`,
      params: [
        game.id,
        game.userId,
        game.source,
        game.playedAt.toISOString(),
        game.timeClass,
        game.playerColor,
        game.result,
        game.opening.eco,
        game.opening.name,
        game.opponent.username,
        game.opponent.rating,
        game.playerRating,
        game.termination,
        game.ratingChange ?? null,
        game.moveCount,
        game.rated ? 1 : 0,
        game.gameUrl,
        game.clock?.initialTime ?? null,
        game.clock?.increment ?? null,
        game.clock?.timeRemaining ?? null,
        game.clock?.avgMoveTime ?? null,
        game.analysis?.accuracy ?? null,
        game.analysis?.blunders ?? null,
        game.analysis?.mistakes ?? null,
        game.analysis?.inaccuracies ?? null,
        game.analysis?.acpl ?? null,
        game.analysis?.analyzedAt?.toISOString() ?? null,
      ],
    }));

    await this.db.batch(statements);
    return games.length;
  }

  async deleteByUser(userId: number): Promise<number> {
    const result = await this.db.execute(
      'DELETE FROM games WHERE user_id = ?',
      [userId],
    );
    return result.changes;
  }

  // ============================================
  // HELPERS
  // ============================================

  private rowToGame(row: GameRow): Game {
    // Build clock data if available
    let clock: ClockData | undefined;
    if (row.initial_time !== null) {
      clock = {
        initialTime: row.initial_time,
        increment: row.increment ?? 0,
        timeRemaining: row.time_remaining ?? undefined,
        avgMoveTime: row.avg_move_time ?? undefined,
      };
    }

    // Build analysis data if available (check analyzed_at since blunders defaults to 0)
    let analysis: AnalysisData | undefined;
    if (row.analyzed_at !== null) {
      analysis = {
        accuracy: row.accuracy ?? undefined,
        blunders: row.blunders ?? 0,
        mistakes: row.mistakes ?? 0,
        inaccuracies: row.inaccuracies ?? 0,
        acpl: row.acpl ?? undefined,
        analyzedAt: row.analyzed_at ? new Date(row.analyzed_at) : undefined,
      };
    }

    return {
      id: row.id,
      userId: row.user_id,
      source: row.source as GameSource,
      playedAt: new Date(row.played_at),
      timeClass: row.time_class as Game['timeClass'],
      playerColor: row.player_color as Game['playerColor'],
      result: row.result as Game['result'],
      opening: {
        eco: row.opening_eco || 'Unknown',
        name: row.opening_name || 'Unknown Opening',
      },
      opponent: {
        username: row.opponent_username || 'Unknown',
        rating: row.opponent_rating || 0,
      },
      playerRating: row.player_rating || 0,
      termination: (row.termination || 'other') as Game['termination'],
      ratingChange: row.rating_change ?? undefined,
      moveCount: row.move_count || 0,
      rated: row.rated === 1,
      gameUrl: row.game_url || '',
      clock,
      analysis,
    };
  }

  private buildWhereClause(filter: GameFilter): {
    whereClauses: string[];
    whereParams: unknown[];
  } {
    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];

    if (filter.timeClasses.length > 0) {
      const placeholders = filter.timeClasses.map(() => '?').join(', ');
      whereClauses.push(`time_class IN (${placeholders})`);
      whereParams.push(...filter.timeClasses);
    }

    if (filter.colors.length > 0) {
      const placeholders = filter.colors.map(() => '?').join(', ');
      whereClauses.push(`player_color IN (${placeholders})`);
      whereParams.push(...filter.colors);
    }

    if (filter.results.length > 0) {
      const placeholders = filter.results.map(() => '?').join(', ');
      whereClauses.push(`result IN (${placeholders})`);
      whereParams.push(...filter.results);
    }

    if (filter.sources.length > 0) {
      const placeholders = filter.sources.map(() => '?').join(', ');
      whereClauses.push(`source IN (${placeholders})`);
      whereParams.push(...filter.sources);
    }

    if (filter.rated !== null) {
      whereClauses.push('rated = ?');
      whereParams.push(filter.rated ? 1 : 0);
    }

    if (filter.dateRange) {
      if (filter.dateRange.start) {
        whereClauses.push('played_at >= ?');
        whereParams.push(filter.dateRange.start.toISOString());
      }
      if (filter.dateRange.end) {
        whereClauses.push('played_at <= ?');
        whereParams.push(filter.dateRange.end.toISOString());
      }
    }

    if (filter.openings.length > 0) {
      const placeholders = filter.openings.map(() => '?').join(', ');
      whereClauses.push(`opening_eco IN (${placeholders})`);
      whereParams.push(...filter.openings);
    }

    if (filter.opponents.length > 0) {
      const lowerOpponents = filter.opponents.map((o) => o.toLowerCase());
      const placeholders = lowerOpponents.map(() => '?').join(', ');
      whereClauses.push(`LOWER(opponent_username) IN (${placeholders})`);
      whereParams.push(...lowerOpponents);
    }

    if (filter.opponentRatingRange) {
      if (filter.opponentRatingRange.min !== undefined) {
        whereClauses.push('opponent_rating >= ?');
        whereParams.push(filter.opponentRatingRange.min);
      }
      if (filter.opponentRatingRange.max !== undefined) {
        whereClauses.push('opponent_rating <= ?');
        whereParams.push(filter.opponentRatingRange.max);
      }
    }

    if (filter.terminations.length > 0) {
      const placeholders = filter.terminations.map(() => '?').join(', ');
      whereClauses.push(`termination IN (${placeholders})`);
      whereParams.push(...filter.terminations);
    }

    return { whereClauses, whereParams };
  }
}
