import { NextResponse } from 'next/server';
import { createSyncService, createUserService } from '@/lib/infrastructure/factories';
import { AppError } from '@/lib/shared/errors';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/shared/rate-limit';

/**
 * POST /api/sync
 * Trigger a sync of games from configured platforms
 * 
 * Body:
 * - fullSync: boolean (optional) - If true, fetch all games. Otherwise, incremental sync.
 */
export async function POST(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`sync:${clientId}`, RATE_LIMITS.sync);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.', code: 'RATE_LIMIT_EXCEEDED' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        }
      );
    }

    const userService = await createUserService();
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
    const updatedUser = await userService.getCurrentUser();

    return NextResponse.json({
      success: result.success,
      newGamesCount: result.newGamesCount,
      totalGamesCount: result.totalGamesCount,
      sources: result.sources,
      lastSyncedAt: updatedUser?.lastSyncedAt?.toISOString() || null,
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
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`sync:${clientId}`, RATE_LIMITS.sync);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.', code: 'RATE_LIMIT_EXCEEDED' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        }
      );
    }

    const userService = await createUserService();
    const user = await userService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No user found. Please set up your profile first.', code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    const syncService = await createSyncService();
    const result = await syncService.fullResync(user.id);
    const updatedUser = await userService.getCurrentUser();

    return NextResponse.json({
      success: result.success,
      newGamesCount: result.newGamesCount,
      totalGamesCount: result.totalGamesCount,
      sources: result.sources,
      lastSyncedAt: updatedUser?.lastSyncedAt?.toISOString() || null,
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
