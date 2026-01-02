import { NextResponse } from 'next/server';
import { createGameService, createUserService } from '@/lib/infrastructure/factories';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { GameFilter } from '@/lib/domain/models/GameFilter';
import { AppError, ValidationError, UnauthorizedError } from '@/lib/shared/errors';
import {
  validatePlayerColor,
  validateResult,
  validateOptionalEcoCode,
} from '@/lib/shared/validation';

/**
 * GET /api/games
 * Get games for the authenticated user with optional filtering
 * 
 * Query params:
 * - timeClasses: comma-separated (bullet,blitz,rapid,classical)
 * - colors: comma-separated (white,black)
 * - results: comma-separated (win,loss,draw)
 * - sources: comma-separated (chesscom,lichess)
 * - rated: true/false
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - openings: comma-separated ECO codes
 * - opponents: comma-separated usernames
 * - minRating: number
 * - maxRating: number
 * - eco: single ECO code (for game links)
 * - color: single color (for game links)
 * - result: single result (for game links)
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    const userService = await createUserService();
    const user = await userService.getUserById(authUser.id);

    const gameService = await createGameService();
    const { searchParams } = new URL(request.url);

    // Parse filter from query params
    const filterParams: Record<string, string | undefined> = {
      timeClasses: searchParams.get('timeClasses') || undefined,
      colors: searchParams.get('colors') || undefined,
      results: searchParams.get('results') || undefined,
      sources: searchParams.get('sources') || undefined,
      rated: searchParams.get('rated') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      openings: searchParams.get('openings') || undefined,
      opponents: searchParams.get('opponents') || undefined,
      minRating: searchParams.get('minRating') || undefined,
      maxRating: searchParams.get('maxRating') || undefined,
    };

    // Build filter
    let filter = GameFilter.fromParams(filterParams);

    // Special case: single ECO code for game links (with validation)
    const ecoParam = searchParams.get('eco');
    const colorParam = searchParams.get('color');
    const resultParam = searchParams.get('result');

    if (ecoParam) {
      const eco = validateOptionalEcoCode(ecoParam);
      if (eco) {
        filter = filter.withOpenings([eco]);
      }
    }
    if (colorParam) {
      const color = validatePlayerColor(colorParam);
      filter = filter.withColors([color]);
    }
    if (resultParam) {
      const result = validateResult(resultParam);
      filter = filter.withResults([result]);
    }

    const games = await gameService.getGames(user.id, filter.isEmpty() ? undefined : filter);

    // Serialize games for JSON response
    const serializedGames = games.map((game) => ({
      id: game.id,
      source: game.source,
      playedAt: game.playedAt.toISOString(),
      timeClass: game.timeClass,
      playerColor: game.playerColor,
      result: game.result,
      opening: game.opening,
      opponent: game.opponent,
      playerRating: game.playerRating,
      termination: game.termination,
      moveCount: game.moveCount,
      ratingChange: game.ratingChange,
      rated: game.rated,
      gameUrl: game.gameUrl,
      clock: game.clock,
      analysis: game.analysis ? {
        ...game.analysis,
        analyzedAt: game.analysis.analyzedAt?.toISOString(),
      } : undefined,
    }));

    return NextResponse.json({
      games: serializedGames,
      count: serializedGames.length,
    });
  } catch (error) {
    console.error('GET /api/games error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, field: error.field },
        { status: 400 },
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
