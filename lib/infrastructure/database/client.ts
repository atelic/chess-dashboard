import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import type { IDatabaseClient } from '@/lib/domain/repositories/interfaces';
import { DatabaseError } from '@/lib/shared/errors';

/**
 * SQLite implementation of IDatabaseClient using better-sqlite3
 */
export class SQLiteClient implements IDatabaseClient {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      this.db = new Database(dbPath);
      // Enable WAL mode for better concurrent performance
      this.db.pragma('journal_mode = WAL');
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
    } catch (error) {
      throw new DatabaseError(
        `Failed to open database at ${dbPath}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  query<T>(sql: string, params: unknown[] = []): T[] {
    try {
      return this.db.prepare(sql).all(...params) as T[];
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${sql}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    try {
      const result = this.db.prepare(sql).run(...params);
      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    } catch (error) {
      throw new DatabaseError(
        `Execute failed: ${sql}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  transaction<T>(fn: () => T): T {
    try {
      return this.db.transaction(fn)();
    } catch (error) {
      throw new DatabaseError(
        'Transaction failed',
        error instanceof Error ? error : undefined,
      );
    }
  }

  close(): void {
    this.db.close();
  }

  /**
   * Execute raw SQL (for migrations)
   */
  exec(sql: string): void {
    try {
      this.db.exec(sql);
    } catch (error) {
      throw new DatabaseError(
        `Exec failed: ${sql.slice(0, 100)}...`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}

// ============================================
// SINGLETON MANAGEMENT
// ============================================

let clientInstance: SQLiteClient | null = null;

/**
 * Get the database client (singleton)
 */
export function getDatabase(): SQLiteClient {
  if (!clientInstance) {
    const dbPath = process.env.DATABASE_PATH || './data/chess.db';
    clientInstance = new SQLiteClient(dbPath);
    runMigrations(clientInstance);
  }
  return clientInstance;
}

/**
 * Set the database client (for testing)
 */
export function setDatabase(client: SQLiteClient | null): void {
  clientInstance = client;
}

/**
 * Close and clear the database connection
 */
export function closeDatabase(): void {
  if (clientInstance) {
    clientInstance.close();
    clientInstance = null;
  }
}

// ============================================
// MIGRATIONS
// ============================================

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      -- Users table (single user for now, but extensible)
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chesscom_username TEXT,
        lichess_username TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TEXT
      );

      -- Games table
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
        game_url TEXT
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
      CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);
      CREATE INDEX IF NOT EXISTS idx_games_source ON games(source);
      CREATE INDEX IF NOT EXISTS idx_games_opening_eco ON games(opening_eco);
      CREATE INDEX IF NOT EXISTS idx_games_result ON games(result);
      CREATE INDEX IF NOT EXISTS idx_games_time_class ON games(time_class);

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    version: 2,
    name: 'add_clock_and_analysis_fields',
    sql: `
      -- Clock data columns
      ALTER TABLE games ADD COLUMN initial_time INTEGER;
      ALTER TABLE games ADD COLUMN increment INTEGER;
      ALTER TABLE games ADD COLUMN time_remaining REAL;
      ALTER TABLE games ADD COLUMN avg_move_time REAL;
      
      -- Analysis data columns (NULL = not analyzed, 0 = analyzed with zero errors)
      -- Note: DEFAULT 0 was a mistake, fixed in migration 4
      ALTER TABLE games ADD COLUMN accuracy INTEGER;
      ALTER TABLE games ADD COLUMN blunders INTEGER DEFAULT 0;
      ALTER TABLE games ADD COLUMN mistakes INTEGER DEFAULT 0;
      ALTER TABLE games ADD COLUMN inaccuracies INTEGER DEFAULT 0;
      ALTER TABLE games ADD COLUMN acpl INTEGER;
      ALTER TABLE games ADD COLUMN analyzed_at TEXT;
      
      -- Index for time-based queries
      CREATE INDEX IF NOT EXISTS idx_games_initial_time ON games(initial_time);
      CREATE INDEX IF NOT EXISTS idx_games_accuracy ON games(accuracy);
    `,
  },
  {
    version: 3,
    name: 'add_game_analysis_table',
    sql: `
      -- Detailed game analysis storage (per-move analysis)
      CREATE TABLE IF NOT EXISTS game_analysis (
        game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
        move_analyses TEXT,           -- JSON array of MoveAnalysis objects
        analyzed_at TEXT NOT NULL,
        analysis_depth INTEGER DEFAULT 16
      );
      
      -- Index for finding games needing re-analysis
      CREATE INDEX IF NOT EXISTS idx_game_analysis_analyzed_at 
        ON game_analysis(analyzed_at);
    `,
  },
  {
    version: 4,
    name: 'fix_analysis_defaults_to_null',
    sql: `
      -- Fix: analysis columns should be NULL when not analyzed, not 0
      -- 0 means "analyzed with zero errors", NULL means "not yet analyzed"
      UPDATE games SET 
        blunders = NULL,
        mistakes = NULL,
        inaccuracies = NULL
      WHERE analyzed_at IS NULL;
    `,
  },
];

/**
 * Run pending migrations
 */
function runMigrations(client: SQLiteClient): void {
  // Ensure migrations table exists
  client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get applied migrations
  const applied = client.query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  const appliedVersions = new Set(applied.map((m) => m.version));

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      
      client.transaction(() => {
        client.exec(migration.sql);
        client.execute(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name],
        );
      });
      
      console.log(`Migration ${migration.version} complete`);
    }
  }
}
