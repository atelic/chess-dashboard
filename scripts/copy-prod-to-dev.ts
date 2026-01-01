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
 * 
 * Note: Schema is created via the same migrations used by getDatabase(),
 * ensuring dev and prod schemas stay in sync.
 */

import { createClient } from '@libsql/client';
import type { InArgs, ResultSet } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BATCH_SIZE = 100;
const DEV_DB_PATH = path.join(process.cwd(), 'data', 'dev.db');

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
  const dataDir = path.dirname(DEV_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data/ directory');
  }

  // Remove existing dev database for fresh copy
  if (fs.existsSync(DEV_DB_PATH)) {
    fs.unlinkSync(DEV_DB_PATH);
    console.log('Removed existing dev.db');
  }
  // Also remove journal files if they exist
  for (const suffix of ['-wal', '-shm']) {
    const journalPath = `${DEV_DB_PATH}${suffix}`;
    if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
  }

  // Create dev database with migrations via getDatabase()
  // This ensures schema stays in sync with client.ts migrations
  console.log('Step 1: Creating dev database with migrations...');
  
  // Import and call getDatabase to run migrations
  // Set NODE_ENV to development to use local file
  (process.env as Record<string, string>).NODE_ENV = 'development';
  
  const { getDatabase, closeDatabase } = await import('../lib/infrastructure/database/client');
  await getDatabase();
  closeDatabase(); // Close so we can use direct client for bulk inserts
  console.log('Schema created via migrations!');
  console.log();

  // Connect directly to dev database for bulk data copy
  const dev = createClient({ url: `file:${DEV_DB_PATH}` });

  // 2. Clear any auto-created data and copy users from prod
  console.log('Step 2: Copying users...');
  await dev.execute('DELETE FROM users');
  
  const usersResult = await prod.execute('SELECT * FROM users');
  const users = rowsToObjects<{ id: number; chesscom_username: string | null; lichess_username: string | null; created_at: string; last_synced_at: string | null }>(usersResult);
  console.log(`Found ${users.length} user(s) to copy`);

  for (const user of users) {
    await dev.execute({
      sql: `INSERT INTO users (id, chesscom_username, lichess_username, created_at, last_synced_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [user.id, user.chesscom_username, user.lichess_username, user.created_at, user.last_synced_at] as InArgs,
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
  const games = rowsToObjects<Record<string, unknown>>(gamesResult);
  const gameColumns = gamesResult.columns;

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    const placeholders = gameColumns.map(() => '?').join(', ');
    const statements = batch.map(game => ({
      sql: `INSERT INTO games (${gameColumns.join(', ')}) VALUES (${placeholders})`,
      args: gameColumns.map(col => game[col]) as InArgs,
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
    const analyses = rowsToObjects<Record<string, unknown>>(analysesResult);
    const analysisColumns = analysesResult.columns;
    
    if (analyses.length > 0) {
      console.log(`Found ${analyses.length} game analyses to copy`);
      const placeholders = analysisColumns.map(() => '?').join(', ');
      
      for (let i = 0; i < analyses.length; i += BATCH_SIZE) {
        const batch = analyses.slice(i, i + BATCH_SIZE);
        const statements = batch.map(a => ({
          sql: `INSERT INTO game_analysis (${analysisColumns.join(', ')}) VALUES (${placeholders})`,
          args: analysisColumns.map(col => a[col]) as InArgs,
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

  // 5. Verify copy
  console.log('Step 5: Verifying copy...');
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
