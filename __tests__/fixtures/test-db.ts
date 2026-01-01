import { createClient } from '@libsql/client';
import type { IDatabaseClient } from '@/lib/domain/repositories/interfaces';
import type { Client, InArgs, ResultSet } from '@libsql/client';

/**
 * Create an in-memory database client for testing
 */
export class TestDatabaseClient implements IDatabaseClient {
  private client: Client;

  constructor() {
    this.client = createClient({
      url: ':memory:',
    });
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.execute({
      sql,
      args: params as InArgs,
    });
    return this.rowsToObjects<T>(result);
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.client.execute({
      sql,
      args: params as InArgs,
    });
    return {
      changes: result.rowsAffected,
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    };
  }

  async batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
    await this.client.batch(
      statements.map((s) => ({
        sql: s.sql,
        args: (s.params || []) as InArgs,
      })),
      'write'
    );
  }

  async exec(sql: string): Promise<void> {
    await this.client.executeMultiple(sql);
  }

  close(): void {
    this.client.close();
  }

  private rowsToObjects<T>(result: ResultSet): T[] {
    return result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj as T;
    });
  }
}

/**
 * Schema for test database (simplified version of migrations)
 */
export const TEST_SCHEMA = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chesscom_username TEXT,
    lichess_username TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TEXT
  );

  -- Games table with all columns
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('chesscom', 'lichess')),
    played_at TEXT NOT NULL,
    time_class TEXT NOT NULL CHECK (time_class IN ('bullet', 'blitz', 'rapid', 'classical')),
    player_color TEXT NOT NULL CHECK (player_color IN ('white', 'black')),
    result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
    opening_eco TEXT,
    opening_name TEXT,
    opponent_username TEXT,
    opponent_rating INTEGER,
    player_rating INTEGER,
    termination TEXT,
    rating_change INTEGER,
    move_count INTEGER,
    rated INTEGER NOT NULL DEFAULT 1,
    game_url TEXT,
    -- Clock data
    initial_time INTEGER,
    increment INTEGER,
    time_remaining REAL,
    avg_move_time REAL,
    -- Analysis data
    accuracy INTEGER,
    blunders INTEGER,
    mistakes INTEGER,
    inaccuracies INTEGER,
    acpl INTEGER,
    analyzed_at TEXT
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
  CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_games_source ON games(source);
  CREATE INDEX IF NOT EXISTS idx_games_opening_eco ON games(opening_eco);
`;

/**
 * Create a test database with schema applied
 */
export async function createTestDatabase(): Promise<TestDatabaseClient> {
  const db = new TestDatabaseClient();
  await db.exec(TEST_SCHEMA);
  return db;
}

/**
 * Insert a test user and return the ID
 */
export async function insertTestUser(
  db: TestDatabaseClient,
  data: { chesscomUsername?: string | null; lichessUsername?: string | null } = {}
): Promise<number> {
  const result = await db.execute(
    'INSERT INTO users (chesscom_username, lichess_username) VALUES (?, ?)',
    [data.chesscomUsername ?? 'testuser', data.lichessUsername ?? 'testuser']
  );
  return result.lastInsertRowid;
}

/**
 * Clear all data from tables (for test isolation)
 */
export async function clearTestData(db: TestDatabaseClient): Promise<void> {
  await db.execute('DELETE FROM games');
  await db.execute('DELETE FROM users');
}
