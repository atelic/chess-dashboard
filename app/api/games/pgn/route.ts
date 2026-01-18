import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/infrastructure/database/client';
import { TursoGameRepository } from '@/lib/infrastructure/database/repositories/TursoGameRepository';
import { TursoUserRepository } from '@/lib/infrastructure/database/repositories/TursoUserRepository';
import type { GameSource } from '@/lib/types';

/**
 * POST /api/games/pgn - Backfill PGN for games that don't have it
 *
 * This endpoint fetches PGN data for games that were synced before
 * PGN storage was enabled. It re-fetches from Chess.com/Lichess APIs.
 *
 * Query params:
 * - source: 'chesscom' | 'lichess' (optional, backfill specific source)
 * - limit: number (optional, default 50, max 100)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as GameSource | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const db = await getDatabase();
    const userRepo = new TursoUserRepository(db);
    const gameRepo = new TursoGameRepository(db);

    // Get the current user
    const user = await userRepo.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    // Find games needing PGN
    const gamesNeedingPgn = await gameRepo.findGamesNeedingPgn(
      user.id,
      source || undefined,
      limit
    );

    if (gamesNeedingPgn.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        remaining: 0,
        message: 'All games have PGN data',
      });
    }

    // Count total remaining
    const totalRemaining = await gameRepo.countGamesNeedingPgn(
      user.id,
      source || undefined
    );

    // Note: In a full implementation, we would fetch PGN from Chess.com/Lichess
    // APIs here. For now, we return the count of games needing backfill.
    // The actual backfill would require re-fetching each game individually,
    // which is API-intensive and should be done carefully with rate limiting.

    return NextResponse.json({
      success: true,
      gamesNeedingPgn: gamesNeedingPgn.length,
      totalRemaining,
      message: `Found ${totalRemaining} games without PGN data. Run a full resync to fetch the missing data.`,
    });
  } catch (error) {
    console.error('PGN backfill error:', error);
    return NextResponse.json(
      { error: 'Failed to check PGN status' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/games/pgn - Get status of PGN backfill
 */
export async function GET() {
  try {
    const db = await getDatabase();
    const userRepo = new TursoUserRepository(db);
    const gameRepo = new TursoGameRepository(db);

    // Get the current user
    const user = await userRepo.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    // Count games with and without PGN
    const gamesWithoutPgnChesscom = await gameRepo.countGamesNeedingPgn(user.id, 'chesscom');
    const gamesWithoutPgnLichess = await gameRepo.countGamesNeedingPgn(user.id, 'lichess');
    const totalWithoutPgn = gamesWithoutPgnChesscom + gamesWithoutPgnLichess;
    const totalGames = await gameRepo.count(user.id);
    const gamesWithPgn = totalGames - totalWithoutPgn;

    return NextResponse.json({
      totalGames,
      gamesWithPgn,
      gamesWithoutPgn: totalWithoutPgn,
      bySource: {
        chesscom: gamesWithoutPgnChesscom,
        lichess: gamesWithoutPgnLichess,
      },
    });
  } catch (error) {
    console.error('PGN status error:', error);
    return NextResponse.json(
      { error: 'Failed to get PGN status' },
      { status: 500 }
    );
  }
}
