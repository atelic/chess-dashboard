import { NextResponse } from 'next/server';
import { fetchLichessGameAnalysis } from '@/lib/infrastructure/api-clients/LichessClient';
import { fetchChessComGameAnalysis } from '@/lib/infrastructure/api-clients/ChessComClient';
import { createGameService } from '@/lib/infrastructure/factories';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import type { AnalysisData } from '@/lib/types';
import { AppError, ValidationError, UnauthorizedError } from '@/lib/shared/errors';
import {
  validateGameId,
  validatePlayerColor,
  validateSource,
  validateUsername,
  validateGameUrl,
  validateDateString,
} from '@/lib/shared/validation';

/**
 * GET /api/games/analysis?gameId=xxx&playerColor=white&source=lichess
 * GET /api/games/analysis?gameId=xxx&playerColor=white&source=chesscom&username=xxx&gameUrl=xxx&gameDate=xxx
 * 
 * Fetch analysis for a Lichess or Chess.com game (requires authentication)
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated (throws if not)
    await getAuthenticatedUser();

    const { searchParams } = new URL(request.url);
    
    // Validate required parameters
    const gameId = validateGameId(searchParams.get('gameId'));
    const playerColor = validatePlayerColor(searchParams.get('playerColor'));
    const source = searchParams.get('source') ? validateSource(searchParams.get('source')) : 'lichess';

    let analysis: AnalysisData | null = null;

    if (source === 'chesscom') {
      // Chess.com requires additional params - validate them
      const username = validateUsername(searchParams.get('username'), 'username');
      const gameUrl = validateGameUrl(searchParams.get('gameUrl'));
      const gameDate = validateDateString(searchParams.get('gameDate'), 'gameDate');

      const chesscomAnalysis = await fetchChessComGameAnalysis(username, gameUrl, gameDate, playerColor);

      if (!chesscomAnalysis || chesscomAnalysis.accuracy === undefined) {
        return NextResponse.json(
          { 
            error: 'No analysis available. Request Game Review on Chess.com first.', 
            analysis: null,
            reviewUrl: `${gameUrl}?tab=review`
          },
          { status: 404 }
        );
      }

      // Convert to our AnalysisData format
      // Note: Chess.com only provides accuracy, not blunder/mistake/inaccuracy counts
      analysis = {
        accuracy: chesscomAnalysis.accuracy,
        blunders: 0, // Not available from Chess.com API
        mistakes: 0, // Not available from Chess.com API
        inaccuracies: 0, // Not available from Chess.com API
        analyzedAt: new Date(),
      };
    } else {
      // Default to Lichess (for backwards compatibility)
      const lichessAnalysis = await fetchLichessGameAnalysis(gameId, playerColor);

      if (!lichessAnalysis) {
        return NextResponse.json(
          { error: 'No analysis available for this game on Lichess', analysis: null },
          { status: 404 }
        );
      }

      // Convert to our AnalysisData format
      analysis = {
        accuracy: lichessAnalysis.accuracy,
        blunders: lichessAnalysis.blunders,
        mistakes: lichessAnalysis.mistakes,
        inaccuracies: lichessAnalysis.inaccuracies,
        acpl: lichessAnalysis.acpl,
        analyzedAt: new Date(),
      };
    }

    // Update the game in the database with the analysis
    let saveWarning: string | undefined;
    try {
      const gameService = await createGameService();
      await gameService.updateGameAnalysis(gameId, analysis);
    } catch (dbError) {
      console.error('Failed to save analysis to database:', dbError);
      saveWarning = 'Analysis fetched but could not be saved. It may not persist on reload.';
    }

    return NextResponse.json({ analysis, warning: saveWarning });
  } catch (error) {
    console.error('GET /api/games/analysis error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, field: error.field },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch analysis', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
