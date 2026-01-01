import { createClient, type Client, type ResultSet, type InArgs } from '@libsql/client';
import type { IDatabaseClient } from '@/lib/domain/repositories/interfaces';
import { DatabaseError } from '@/lib/shared/errors';

/**
 * Turso/libSQL implementation of IDatabaseClient
 */
export class TursoClient implements IDatabaseClient {
  private client: Client;

  constructor(url: string, authToken?: string) {
    this.client = createClient({
      url,
      authToken,
    });
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.client.execute({ 
        sql, 
        args: params as InArgs,
      });
      return this.rowsToObjects<T>(result);
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${sql}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    try {
      const result = await this.client.execute({ 
        sql, 
        args: params as InArgs,
      });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: Number(result.lastInsertRowid ?? 0),
      };
    } catch (error) {
      throw new DatabaseError(
        `Execute failed: ${sql}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
    try {
      await this.client.batch(
        statements.map(s => ({ 
          sql: s.sql, 
          args: (s.params || []) as InArgs,
        })),
        'write',
      );
    } catch (error) {
      throw new DatabaseError(
        'Batch operation failed',
        error instanceof Error ? error : undefined,
      );
    }
  }

  async exec(sql: string): Promise<void> {
    try {
      await this.client.executeMultiple(sql);
    } catch (error) {
      throw new DatabaseError(
        `Exec failed: ${sql.slice(0, 100)}...`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  close(): void {
    this.client.close();
  }

  /**
   * Convert libSQL rows to typed objects
   */
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

// ============================================
// SINGLETON MANAGEMENT
// ============================================

let clientInstance: TursoClient | null = null;
let migrationsRun = false;

/**
 * Get the database client (singleton)
 * 
 * In development (NODE_ENV=development), uses local SQLite file at ./data/dev.db
 * In production, uses Turso cloud database via TURSO_DATABASE_URL
 * 
 * Set USE_PROD_DB=true to force production database in development
 */
export async function getDatabase(): Promise<TursoClient> {
  if (!clientInstance) {
    const isDev = process.env.NODE_ENV === 'development';
    const useProdDb = process.env.USE_PROD_DB === 'true';
    
    let url: string;
    let authToken: string | undefined;
    
    if (isDev && !useProdDb) {
      // Development: use local SQLite file
      url = 'file:./data/dev.db';
      authToken = undefined;
      if (isDev) console.log('Using local dev database: ./data/dev.db');
    } else {
      // Production or USE_PROD_DB override
      url = process.env.TURSO_DATABASE_URL!;
      authToken = process.env.TURSO_AUTH_TOKEN;
      
      if (!url) {
        throw new DatabaseError('TURSO_DATABASE_URL environment variable is not set');
      }
    }
    
    clientInstance = new TursoClient(url, authToken);
  }
  
  if (!migrationsRun) {
    await runMigrations(clientInstance);
    migrationsRun = true;
  }
  
  return clientInstance;
}

/**
 * Set the database client (for testing)
 */
export function setDatabase(client: TursoClient | null): void {
  clientInstance = client;
  migrationsRun = false;
}

/**
 * Close and clear the database connection
 */
export function closeDatabase(): void {
  if (clientInstance) {
    clientInstance.close();
    clientInstance = null;
    migrationsRun = false;
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
async function runMigrations(client: TursoClient): Promise<void> {
  // Ensure migrations table exists
  await client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get applied migrations
  const applied = await client.query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  const appliedVersions = new Set(applied.map((m) => m.version));

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      
      // Execute migration SQL
      await client.exec(migration.sql);
      
      // Record migration
      await client.execute(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name],
      );
      
      console.log(`Migration ${migration.version} complete`);
    }
  }
}
