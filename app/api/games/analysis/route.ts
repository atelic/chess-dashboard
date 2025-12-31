import { NextResponse } from 'next/server';
import { fetchLichessGameAnalysis } from '@/lib/infrastructure/api-clients/LichessClient';
import { createGameService, createUserService } from '@/lib/infrastructure/factories';
import type { AnalysisData } from '@/lib/types';

/**
 * GET /api/games/analysis?gameId=xxx&playerColor=white
 * Fetch analysis for a Lichess game
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const playerColor = searchParams.get('playerColor') as 'white' | 'black' | null;

    if (!gameId || !playerColor) {
      return NextResponse.json(
        { error: 'gameId and playerColor are required' },
        { status: 400 }
      );
    }

    // Fetch analysis from Lichess
    const lichessAnalysis = await fetchLichessGameAnalysis(gameId, playerColor);

    if (!lichessAnalysis) {
      return NextResponse.json(
        { error: 'No analysis available for this game on Lichess', analysis: null },
        { status: 404 }
      );
    }

    // Convert to our AnalysisData format
    const analysis: AnalysisData = {
      accuracy: lichessAnalysis.accuracy,
      blunders: lichessAnalysis.blunders,
      mistakes: lichessAnalysis.mistakes,
      inaccuracies: lichessAnalysis.inaccuracies,
      acpl: lichessAnalysis.acpl,
      analyzedAt: new Date(),
    };

    // Update the game in the database with the analysis
    try {
      const userService = createUserService();
      const user = await userService.getCurrentUser();
      
      if (user) {
        const gameService = createGameService();
        await gameService.updateGameAnalysis(gameId, analysis);
      }
    } catch (dbError) {
      // Log but don't fail the request if DB update fails
      console.error('Failed to save analysis to database:', dbError);
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('GET /api/games/analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
