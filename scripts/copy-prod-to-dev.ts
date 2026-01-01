/**
 * Copy all data from production Turso database to local dev SQLite
 * 
 * Usage:
 *   npx tsx scripts/copy-prod-to-dev.ts
 * 
 * Requires:
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
 * 
 * Creates:
 *   - Local database at ./data/dev.db with all production data
 */

import { createClient } from '@libsql/client';
import type { InArgs, ResultSet } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 100;

// Full schema SQL for creating tables
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

interface GameAnalysisRow {
  game_id: string;
  move_analyses: string | null;
  analyzed_at: string;
  analysis_depth: number | null;
}

/**
 * Convert libSQL result rows to typed objects
 */
function rowsToObjects<T>(result: ResultSet): T[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

async function copyProdToDev() {
  console.log('='.repeat(50));
  console.log('Chess Dashboard: Prod -> Dev Database Copy');
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

  console.log('Production URL:', tursoUrl);
  console.log();

  // Connect to production Turso
  console.log('Connecting to production database...');
  const prod = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  try {
    await prod.execute('SELECT 1');
    console.log('Connected to production successfully!');
    console.log();
  } catch (error) {
    console.error('Error: Could not connect to production database');
    console.error(error);
    process.exit(1);
  }

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data/ directory');
  }

  // Remove existing dev database for fresh copy
  const devDbPath = path.join(dataDir, 'dev.db');
  if (fs.existsSync(devDbPath)) {
    fs.unlinkSync(devDbPath);
    console.log('Removed existing dev.db');
  }
  // Also remove journal files if they exist
  const devDbWalPath = `${devDbPath}-wal`;
  const devDbShmPath = `${devDbPath}-shm`;
  if (fs.existsSync(devDbWalPath)) fs.unlinkSync(devDbWalPath);
  if (fs.existsSync(devDbShmPath)) fs.unlinkSync(devDbShmPath);

  // Connect to local dev database
  console.log('Creating local dev database...');
  const dev = createClient({
    url: `file:${devDbPath}`,
  });

  try {
    await dev.execute('SELECT 1');
    console.log('Local dev database ready!');
    console.log();
  } catch (error) {
    console.error('Error: Could not create local dev database');
    console.error(error);
    process.exit(1);
  }

  // 1. Create schema in dev
  console.log('Step 1: Creating schema in dev database...');
  try {
    await dev.executeMultiple(SCHEMA_SQL);
    console.log('Schema created successfully!');
    console.log();
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  }

  // 2. Copy users from prod
  console.log('Step 2: Copying users...');
  const usersResult = await prod.execute('SELECT * FROM users');
  const users = rowsToObjects<UserRow>(usersResult);
  console.log(`Found ${users.length} user(s) to copy`);

  for (const user of users) {
    await dev.execute({
      sql: `INSERT INTO users (id, chesscom_username, lichess_username, created_at, last_synced_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        user.id,
        user.chesscom_username,
        user.lichess_username,
        user.created_at,
        user.last_synced_at,
      ] as InArgs,
    });
    console.log(`  Copied user ${user.id}: ${user.chesscom_username || user.lichess_username || 'unnamed'}`);
  }
  console.log();

  // 3. Copy games in batches
  console.log('Step 3: Copying games...');
  const totalGamesResult = await prod.execute('SELECT COUNT(*) as count FROM games');
  const totalGames = Number(totalGamesResult.rows[0][0]);
  console.log(`Found ${totalGames} games to copy`);

  const gamesResult = await prod.execute('SELECT * FROM games');
  const games = rowsToObjects<GameRow>(gamesResult);

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    const statements = batch.map(game => ({
      sql: `INSERT INTO games (
        id, user_id, source, played_at, time_class, player_color, result,
        opening_eco, opening_name, opponent_username, opponent_rating,
        player_rating, termination, rating_change, move_count, rated, game_url,
        initial_time, increment, time_remaining, avg_move_time,
        accuracy, blunders, mistakes, inaccuracies, acpl, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ] as InArgs,
    }));

    await dev.batch(statements as Parameters<typeof dev.batch>[0], 'write');
    
    const progress = Math.min(i + BATCH_SIZE, games.length);
    const percent = Math.round((progress / totalGames) * 100);
    console.log(`  Progress: ${progress}/${totalGames} games (${percent}%)`);
  }
  console.log();

  // 4. Copy game_analysis if exists
  console.log('Step 4: Copying game analysis data...');
  try {
    const analysesResult = await prod.execute('SELECT * FROM game_analysis');
    const analyses = rowsToObjects<GameAnalysisRow>(analysesResult);
    
    if (analyses.length > 0) {
      console.log(`Found ${analyses.length} game analyses to copy`);
      
      for (let i = 0; i < analyses.length; i += BATCH_SIZE) {
        const batch = analyses.slice(i, i + BATCH_SIZE);
        const statements = batch.map(a => ({
          sql: `INSERT INTO game_analysis (game_id, move_analyses, analyzed_at, analysis_depth)
                VALUES (?, ?, ?, ?)`,
          args: [a.game_id, a.move_analyses, a.analyzed_at, a.analysis_depth] as InArgs,
        }));

        await dev.batch(statements as Parameters<typeof dev.batch>[0], 'write');
      }
      console.log(`  Copied ${analyses.length} game analyses`);
    } else {
      console.log('  No game analyses to copy');
    }
  } catch {
    console.log('  game_analysis table empty or not found, skipping');
  }
  console.log();

  // 5. Copy schema_migrations
  console.log('Step 5: Recording schema migrations...');
  const migrationsResult = await prod.execute('SELECT * FROM schema_migrations');
  const migrations = rowsToObjects<MigrationRow>(migrationsResult);
  
  for (const m of migrations) {
    await dev.execute({
      sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      args: [m.version, m.name, m.applied_at] as InArgs,
    });
  }
  console.log(`  Recorded ${migrations.length} migrations`);
  console.log();

  // 6. Verify copy
  console.log('Step 6: Verifying copy...');
  const devUserCount = await dev.execute('SELECT COUNT(*) as count FROM users');
  const devGameCount = await dev.execute('SELECT COUNT(*) as count FROM games');
  
  const devUsers = Number(devUserCount.rows[0][0]);
  const devGames = Number(devGameCount.rows[0][0]);
  
  console.log(`  Production: ${users.length} users, ${totalGames} games`);
  console.log(`  Dev:        ${devUsers} users, ${devGames} games`);

  if (devUsers === users.length && devGames === totalGames) {
    console.log();
    console.log('='.repeat(50));
    console.log('Copy completed successfully!');
    console.log('='.repeat(50));
    console.log();
    console.log('Dev database created at: ./data/dev.db');
    console.log();
    console.log('Usage:');
    console.log('  npm run dev              # Uses dev database automatically');
    console.log('  USE_PROD_DB=true npm run dev  # Force production database');
  } else {
    console.log();
    console.log('Warning: Count mismatch! Please verify the data.');
  }

  // Cleanup
  prod.close();
  dev.close();
}

copyProdToDev().catch((error) => {
  console.error('Copy failed:', error);
  process.exit(1);
});
