/**
 * One-time migration script: Local SQLite -> Turso
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-turso.ts
 * 
 * Requires:
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
 *   - Local database at ./data/chess.db
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 100;

// Full schema SQL for creating tables in Turso
const SCHEMA_SQL = `
-- Users table
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
  game_url TEXT,
  initial_time INTEGER,
  increment INTEGER,
  time_remaining REAL,
  avg_move_time REAL,
  accuracy INTEGER,
  blunders INTEGER,
  mistakes INTEGER,
  inaccuracies INTEGER,
  acpl INTEGER,
  analyzed_at TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_source ON games(source);
CREATE INDEX IF NOT EXISTS idx_games_opening_eco ON games(opening_eco);
CREATE INDEX IF NOT EXISTS idx_games_result ON games(result);
CREATE INDEX IF NOT EXISTS idx_games_time_class ON games(time_class);
CREATE INDEX IF NOT EXISTS idx_games_initial_time ON games(initial_time);
CREATE INDEX IF NOT EXISTS idx_games_accuracy ON games(accuracy);

-- Game analysis table
CREATE TABLE IF NOT EXISTS game_analysis (
  game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  move_analyses TEXT,
  analyzed_at TEXT NOT NULL,
  analysis_depth INTEGER DEFAULT 16
);

CREATE INDEX IF NOT EXISTS idx_game_analysis_analyzed_at ON game_analysis(analyzed_at);

-- Schema migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

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
  initial_time: number | null;
  increment: number | null;
  time_remaining: number | null;
  avg_move_time: number | null;
  accuracy: number | null;
  blunders: number | null;
  mistakes: number | null;
  inaccuracies: number | null;
  acpl: number | null;
  analyzed_at: string | null;
}

interface UserRow {
  id: number;
  chesscom_username: string | null;
  lichess_username: string | null;
  created_at: string;
  last_synced_at: string | null;
}

interface MigrationRow {
  version: number;
  name: string;
  applied_at: string;
}

async function migrate() {
  console.log('='.repeat(50));
  console.log('Chess Dashboard: SQLite -> Turso Migration');
  console.log('='.repeat(50));
  console.log();

  // Validate environment
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl) {
    console.error('Error: TURSO_DATABASE_URL not set in .env.local');
    process.exit(1);
  }

  if (!tursoToken) {
    console.error('Error: TURSO_AUTH_TOKEN not set in .env.local');
    process.exit(1);
  }

  console.log('Turso URL:', tursoUrl);
  console.log();

  // Connect to local SQLite
  const localDbPath = path.join(process.cwd(), 'data', 'chess.db');
  console.log('Opening local database:', localDbPath);
  
  let local: Database.Database;
  try {
    local = new Database(localDbPath, { readonly: true });
  } catch (error) {
    console.error('Error: Could not open local database at', localDbPath);
    console.error(error);
    process.exit(1);
  }

  // Connect to Turso
  console.log('Connecting to Turso...');
  const turso = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  try {
    // Test connection
    await turso.execute('SELECT 1');
    console.log('Connected to Turso successfully!');
    console.log();
  } catch (error) {
    console.error('Error: Could not connect to Turso');
    console.error(error);
    process.exit(1);
  }

  // 1. Create schema in Turso
  console.log('Step 1: Creating schema in Turso...');
  try {
    await turso.executeMultiple(SCHEMA_SQL);
    console.log('Schema created successfully!');
    console.log();
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  }

  // 2. Migrate users
  console.log('Step 2: Migrating users...');
  const users = local.prepare('SELECT * FROM users').all() as UserRow[];
  console.log(`Found ${users.length} user(s) to migrate`);

  for (const user of users) {
    await turso.execute({
      sql: `INSERT INTO users (id, chesscom_username, lichess_username, created_at, last_synced_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              chesscom_username = excluded.chesscom_username,
              lichess_username = excluded.lichess_username,
              last_synced_at = excluded.last_synced_at`,
      args: [
        user.id,
        user.chesscom_username,
        user.lichess_username,
        user.created_at,
        user.last_synced_at,
      ],
    });
    console.log(`  Migrated user ${user.id}: ${user.chesscom_username || user.lichess_username || 'unnamed'}`);
  }
  console.log();

  // 3. Migrate games in batches
  console.log('Step 3: Migrating games...');
  const totalGames = (local.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number }).count;
  console.log(`Found ${totalGames} games to migrate`);

  const games = local.prepare('SELECT * FROM games').all() as GameRow[];
  
  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    const statements = batch.map(game => ({
      sql: `INSERT INTO games (
        id, user_id, source, played_at, time_class, player_color, result,
        opening_eco, opening_name, opponent_username, opponent_rating,
        player_rating, termination, rating_change, move_count, rated, game_url,
        initial_time, increment, time_remaining, avg_move_time,
        accuracy, blunders, mistakes, inaccuracies, acpl, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`,
      args: [
        game.id,
        game.user_id,
        game.source,
        game.played_at,
        game.time_class,
        game.player_color,
        game.result,
        game.opening_eco,
        game.opening_name,
        game.opponent_username,
        game.opponent_rating,
        game.player_rating,
        game.termination,
        game.rating_change,
        game.move_count,
        game.rated,
        game.game_url,
        game.initial_time,
        game.increment,
        game.time_remaining,
        game.avg_move_time,
        game.accuracy,
        game.blunders,
        game.mistakes,
        game.inaccuracies,
        game.acpl,
        game.analyzed_at,
      ],
    }));

    await turso.batch(statements as Parameters<typeof turso.batch>[0], 'write');
    
    const progress = Math.min(i + BATCH_SIZE, games.length);
    const percent = Math.round((progress / totalGames) * 100);
    console.log(`  Progress: ${progress}/${totalGames} games (${percent}%)`);
  }
  console.log();

  // 4. Migrate game_analysis if exists
  console.log('Step 4: Migrating game analysis data...');
  try {
    const analyses = local.prepare('SELECT * FROM game_analysis').all() as Array<{
      game_id: string;
      move_analyses: string | null;
      analyzed_at: string;
      analysis_depth: number | null;
    }>;
    
    if (analyses.length > 0) {
      console.log(`Found ${analyses.length} game analyses to migrate`);
      
      for (let i = 0; i < analyses.length; i += BATCH_SIZE) {
        const batch = analyses.slice(i, i + BATCH_SIZE);
        const statements = batch.map(a => ({
          sql: `INSERT INTO game_analysis (game_id, move_analyses, analyzed_at, analysis_depth)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(game_id) DO NOTHING`,
          args: [a.game_id, a.move_analyses, a.analyzed_at, a.analysis_depth],
        }));

        await turso.batch(statements as Parameters<typeof turso.batch>[0], 'write');
      }
      console.log(`  Migrated ${analyses.length} game analyses`);
    } else {
      console.log('  No game analyses to migrate');
    }
  } catch {
    console.log('  game_analysis table not found or empty, skipping');
  }
  console.log();

  // 5. Migrate schema_migrations
  console.log('Step 5: Recording schema migrations...');
  const migrations = local.prepare('SELECT * FROM schema_migrations').all() as MigrationRow[];
  
  for (const m of migrations) {
    await turso.execute({
      sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?) ON CONFLICT(version) DO NOTHING',
      args: [m.version, m.name, m.applied_at],
    });
  }
  console.log(`  Recorded ${migrations.length} migrations`);
  console.log();

  // 6. Verify migration
  console.log('Step 6: Verifying migration...');
  const remoteUserCount = await turso.execute('SELECT COUNT(*) as count FROM users');
  const remoteGameCount = await turso.execute('SELECT COUNT(*) as count FROM games');
  
  const remoteUsers = Number(remoteUserCount.rows[0][0]);
  const remoteGames = Number(remoteGameCount.rows[0][0]);
  
  console.log(`  Local:  ${users.length} users, ${totalGames} games`);
  console.log(`  Turso:  ${remoteUsers} users, ${remoteGames} games`);

  if (remoteUsers === users.length && remoteGames === totalGames) {
    console.log();
    console.log('='.repeat(50));
    console.log('Migration completed successfully!');
    console.log('='.repeat(50));
    console.log();
    console.log('Next steps:');
    console.log('1. Test your app locally with: npm run dev');
    console.log('2. Deploy to Vercel and add environment variables:');
    console.log('   - TURSO_DATABASE_URL');
    console.log('   - TURSO_AUTH_TOKEN');
    console.log('3. Configure your domain: chess.ericbarbour.dev');
  } else {
    console.log();
    console.log('Warning: Count mismatch! Please verify the data.');
  }

  // Cleanup
  local.close();
  turso.close();
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
