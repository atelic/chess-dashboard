import { NextResponse } from 'next/server';
import { fetchLichessGameAnalysis } from '@/lib/infrastructure/api-clients/LichessClient';
import { fetchChessComGameAnalysis } from '@/lib/infrastructure/api-clients/ChessComClient';
import { createGameService, createUserService } from '@/lib/infrastructure/factories';
import type { AnalysisData } from '@/lib/types';

/**
 * GET /api/games/analysis?gameId=xxx&playerColor=white&source=lichess
 * GET /api/games/analysis?gameId=xxx&playerColor=white&source=chesscom&username=xxx&gameUrl=xxx&gameDate=xxx
 * 
 * Fetch analysis for a Lichess or Chess.com game
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const playerColor = searchParams.get('playerColor') as 'white' | 'black' | null;
    const source = searchParams.get('source') as 'lichess' | 'chesscom' | null;

    if (!gameId || !playerColor) {
      return NextResponse.json(
        { error: 'gameId and playerColor are required' },
        { status: 400 }
      );
    }

    let analysis: AnalysisData | null = null;

    if (source === 'chesscom') {
      // Chess.com requires additional params
      const username = searchParams.get('username');
      const gameUrl = searchParams.get('gameUrl');
      const gameDateStr = searchParams.get('gameDate');

      if (!username || !gameUrl || !gameDateStr) {
        return NextResponse.json(
          { error: 'username, gameUrl, and gameDate are required for Chess.com analysis' },
          { status: 400 }
        );
      }

      const gameDate = new Date(gameDateStr);
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
      const userService = await createUserService();
      const user = await userService.getCurrentUser();
      
      if (user) {
        const gameService = await createGameService();
        await gameService.updateGameAnalysis(gameId, analysis);
      }
    } catch (dbError) {
      console.error('Failed to save analysis to database:', dbError);
      saveWarning = 'Analysis fetched but could not be saved. It may not persist on reload.';
    }

    return NextResponse.json({ analysis, warning: saveWarning });
  } catch (error) {
    console.error('GET /api/games/analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
