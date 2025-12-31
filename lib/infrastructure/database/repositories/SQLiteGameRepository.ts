import type { IGameRepository } from '@/lib/domain/repositories/interfaces';
import type { Game, GameSource, PlayerColor } from '@/lib/domain/models/Game';
import { GameFilter } from '@/lib/domain/models/GameFilter';
import type { SQLiteClient } from '../client';

/**
 * SQLite row type for games table
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
}

/**
 * SQLite implementation of IGameRepository
 */
export class SQLiteGameRepository implements IGameRepository {
  constructor(private readonly db: SQLiteClient) {}

  // ============================================
  // QUERIES
  // ============================================

  async findAll(userId: number, filter?: GameFilter): Promise<Game[]> {
    let sql = 'SELECT * FROM games WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (filter && !filter.isEmpty()) {
      const { whereClauses, whereParams } = this.buildWhereClause(filter);
      if (whereClauses.length > 0) {
        sql += ' AND ' + whereClauses.join(' AND ');
        params.push(...whereParams);
      }
    }

    sql += ' ORDER BY played_at DESC';

    const rows = this.db.query<GameRow>(sql, params);
    return rows.map((row) => this.rowToGame(row));
  }

  async findById(id: string): Promise<Game | null> {
    const rows = this.db.query<GameRow>(
      'SELECT * FROM games WHERE id = ?',
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
    const rows = this.db.query<GameRow>(
      `SELECT * FROM games WHERE id IN (${placeholders}) ORDER BY played_at DESC`,
      ids,
    );

    return rows.map((row) => this.rowToGame(row));
  }

  async findByEco(userId: number, eco: string, color?: PlayerColor): Promise<Game[]> {
    let sql = 'SELECT * FROM games WHERE user_id = ? AND opening_eco = ?';
    const params: unknown[] = [userId, eco];

    if (color) {
      sql += ' AND player_color = ?';
      params.push(color);
    }

    sql += ' ORDER BY played_at DESC';

    const rows = this.db.query<GameRow>(sql, params);
    return rows.map((row) => this.rowToGame(row));
  }

  async findByOpponent(userId: number, opponent: string): Promise<Game[]> {
    const rows = this.db.query<GameRow>(
      `SELECT * FROM games 
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

    const rows = this.db.query<{ count: number }>(sql, params);
    return rows[0].count;
  }

  async existsById(id: string): Promise<boolean> {
    const rows = this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM games WHERE id = ?',
      [id],
    );
    return rows[0].count > 0;
  }

  async getLatestGameDate(userId: number, source: GameSource): Promise<Date | null> {
    const rows = this.db.query<{ played_at: string }>(
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

  // ============================================
  // MUTATIONS
  // ============================================

  async save(game: Game & { userId: number }): Promise<void> {
    this.db.execute(
      `INSERT OR REPLACE INTO games (
        id, user_id, source, played_at, time_class, player_color, result,
        opening_eco, opening_name, opponent_username, opponent_rating,
        player_rating, termination, rating_change, move_count, rated, game_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    );
  }

  async saveMany(games: (Game & { userId: number })[]): Promise<number> {
    if (games.length === 0) {
      return 0;
    }

    let saved = 0;

    this.db.transaction(() => {
      for (const game of games) {
        this.db.execute(
          `INSERT OR IGNORE INTO games (
            id, user_id, source, played_at, time_class, player_color, result,
            opening_eco, opening_name, opponent_username, opponent_rating,
            player_rating, termination, rating_change, move_count, rated, game_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ],
        );
        saved++;
      }
    });

    return saved;
  }

  async deleteByUser(userId: number): Promise<number> {
    const result = this.db.execute(
      'DELETE FROM games WHERE user_id = ?',
      [userId],
    );
    return result.changes;
  }

  // ============================================
  // HELPERS
  // ============================================

  private rowToGame(row: GameRow): Game {
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
