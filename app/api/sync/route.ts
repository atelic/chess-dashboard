import { NextResponse } from 'next/server';
import { createSyncService, createUserService } from '@/lib/infrastructure/factories';
import { AppError } from '@/lib/shared/errors';

/**
 * POST /api/sync
 * Trigger a sync of games from configured platforms
 * 
 * Body:
 * - fullSync: boolean (optional) - If true, fetch all games. Otherwise, incremental sync.
 */
export async function POST(request: Request) {
  try {
    const userService = createUserService();
    const user = await userService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No user found. Please set up your profile first.', code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    let fullSync = false;
    try {
      const body = await request.json();
      fullSync = body.fullSync === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const syncService = createSyncService();
    const result = await syncService.syncGames(user.id, { fullSync });

    return NextResponse.json({
      success: result.success,
      newGamesCount: result.newGamesCount,
      totalGamesCount: result.totalGamesCount,
      sources: result.sources,
    });
  } catch (error) {
    console.error('POST /api/sync error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sync
 * Delete all games and perform a full resync
 */
export async function DELETE(request: Request) {
  try {
    const userService = createUserService();
    const user = await userService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No user found. Please set up your profile first.', code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    const syncService = createSyncService();
    const result = await syncService.fullResync(user.id);

    return NextResponse.json({
      success: result.success,
      newGamesCount: result.newGamesCount,
      totalGamesCount: result.totalGamesCount,
      sources: result.sources,
    });
  } catch (error) {
    console.error('DELETE /api/sync error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
