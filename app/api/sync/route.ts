import { NextResponse } from 'next/server';
import { createSyncService, createUserService } from '@/lib/infrastructure/factories';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { AppError, UnauthorizedError } from '@/lib/shared/errors';

/**
 * POST /api/sync
 * Trigger a sync of games from configured platforms for the authenticated user
 * 
 * Body:
 * - fullSync: boolean (optional) - If true, fetch all games. Otherwise, incremental sync.
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    const userService = await createUserService();
    const user = await userService.getUserById(authUser.id);

    let fullSync = false;
    try {
      const body = await request.json();
      // Validate fullSync is a boolean if provided
      if (body.fullSync !== undefined && typeof body.fullSync !== 'boolean') {
        return NextResponse.json(
          { error: 'fullSync must be a boolean', code: 'VALIDATION_ERROR' },
          { status: 400 },
        );
      }
      fullSync = body.fullSync === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const syncService = await createSyncService();
    const result = await syncService.syncGames(user.id, { fullSync });

    return NextResponse.json({
      success: result.success,
      newGamesCount: result.newGamesCount,
      totalGamesCount: result.totalGamesCount,
      sources: result.sources,
    });
  } catch (error) {
    console.error('POST /api/sync error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
      );
    }

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
 * Delete all games and perform a full resync for the authenticated user
 */
export async function DELETE() {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    const userService = await createUserService();
    const user = await userService.getUserById(authUser.id);

    const syncService = await createSyncService();
    const result = await syncService.fullResync(user.id);

    return NextResponse.json({
      success: result.success,
      newGamesCount: result.newGamesCount,
      totalGamesCount: result.totalGamesCount,
      sources: result.sources,
    });
  } catch (error) {
    console.error('DELETE /api/sync error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
      );
    }

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
