import { NextResponse } from 'next/server';
import { createGameService, createUserService } from '@/lib/infrastructure/factories';
import { GameFilter } from '@/lib/domain/models/GameFilter';
import { AppError } from '@/lib/shared/errors';

/**
 * GET /api/games
 * Get games for the current user with optional filtering
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
    const userService = createUserService();
    const user = await userService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No user found. Please set up your profile first.', code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    const gameService = createGameService();
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

    // Special case: single ECO code for game links
    const eco = searchParams.get('eco');
    const color = searchParams.get('color');
    const result = searchParams.get('result');

    if (eco) {
      filter = filter.withOpenings([eco]);
    }
    if (color) {
      filter = filter.withColors([color as 'white' | 'black']);
    }
    if (result) {
      filter = filter.withResults([result as 'win' | 'loss' | 'draw']);
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
    }));

    return NextResponse.json({
      games: serializedGames,
      count: serializedGames.length,
    });
  } catch (error) {
    console.error('GET /api/games error:', error);

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
