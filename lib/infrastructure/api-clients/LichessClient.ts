import type { Game, TimeClass, TerminationType, ClockData, AnalysisData } from '@/lib/domain/models/Game';
import type { IChessClient, FetchGamesOptions, LichessGame } from './types';
import { ExternalApiError, InvalidUsernameError, RateLimitError } from '@/lib/shared/errors';

const BASE_URL = 'https://lichess.org/api';

/**
 * Result of fetching game analysis from Lichess
 */
export interface LichessGameAnalysis {
  accuracy?: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  acpl?: number;
}

/**
 * Fetch analysis data for a single Lichess game
 * Returns null if the game hasn't been analyzed on Lichess
 * 
 * Note: Uses https://lichess.org/game/export/ (not /api/game/export/)
 */
export async function fetchLichessGameAnalysis(
  gameId: string,
  playerColor: 'white' | 'black'
): Promise<LichessGameAnalysis | null> {
  try {
    // Note: The single game export endpoint is at /game/export/, not /api/game/export/
    const response = await fetch(
      `https://lichess.org/game/export/${gameId}?accuracy=true&evals=true`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch Lichess game ${gameId}: ${response.status}`);
      return null;
    }

    const game: LichessGame = await response.json();
    const player = playerColor === 'white' ? game.players.white : game.players.black;

    if (!player.analysis) {
      return null;
    }

    return {
      accuracy: player.analysis.accuracy,
      blunders: player.analysis.blunder,
      mistakes: player.analysis.mistake,
      inaccuracies: player.analysis.inaccuracy,
      acpl: player.analysis.acpl,
    };
  } catch (error) {
    console.error(`Error fetching Lichess game analysis:`, error);
    return null;
  }
}

/**
 * Lichess API client for fetching games
 */
export class LichessClient implements IChessClient {
  readonly source = 'lichess' as const;

  /**
   * Validate that a Lichess user exists
   */
  async validateUser(username: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/user/${username}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch games from Lichess
   */
  async fetchGames(username: string, options: FetchGamesOptions = {}): Promise<Game[]> {
    const { maxGames = 100, since, until, fetchAll = false } = options;

    // Build URL with query parameters
    const params = new URLSearchParams({
      opening: 'true',
      moves: 'true',      // Need moves to count them
      clocks: 'true',     // Get time remaining per move
      evals: 'true',      // Get per-move evaluations (if analyzed)
      accuracy: 'true',   // Get accuracy percentages (if analyzed)
    });

    // Set max - if fetchAll, use a high number to ensure all games are fetched
    // Without this, large accounts may experience timeout issues
    if (fetchAll) {
      params.set('max', '10000');
    } else {
      params.set('max', maxGames.toString());
    }

    // Add date filters if provided (Lichess uses millisecond timestamps)
    if (since) {
      params.set('since', since.getTime().toString());
    }
    if (until) {
      params.set('until', until.getTime().toString());
    }

    const url = `${BASE_URL}/games/user/${username}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    if (response.status === 404) {
      throw new InvalidUsernameError('Lichess', username);
    }

    if (response.status === 429) {
      throw new RateLimitError('Lichess');
    }

    if (!response.ok) {
      throw new ExternalApiError('Lichess');
    }

    const games = await this.parseNdjsonStream(response);

    // Convert to unified format
    const converted = games.map((game) => this.convertGame(game, username));

    // Sort by date descending
    return converted.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Parse NDJSON stream response
   */
  private async parseNdjsonStream(response: Response): Promise<LichessGame[]> {
    const text = await response.text();
    const lines = text.trim().split('\n');
    const games: LichessGame[] = [];

    for (const line of lines) {
      if (line.trim()) {
        try {
          games.push(JSON.parse(line));
        } catch (e) {
          console.error('Failed to parse Lichess game line:', e);
        }
      }
    }

    return games;
  }

  /**
   * Convert a Lichess game to our unified Game type
   */
  private convertGame(game: LichessGame, username: string): Game {
    const normalizedUsername = username.toLowerCase();
    const isWhite = game.players.white.user?.id.toLowerCase() === normalizedUsername;
    const playerColor = isWhite ? 'white' : 'black';
    const player = isWhite ? game.players.white : game.players.black;
    const opponent = isWhite ? game.players.black : game.players.white;

    // Determine result
    let result: 'win' | 'loss' | 'draw';
    if (game.winner) {
      result = game.winner === playerColor ? 'win' : 'loss';
    } else {
      result = 'draw';
    }

    // Map time class (Lichess uses 'speed' field)
    const timeClass = this.mapTimeClass(game.speed);

    // Opening info is directly available
    const opening = {
      eco: game.opening?.eco || 'Unknown',
      name: game.opening?.name || 'Unknown Opening',
    };

    // Map termination
    const termination = this.mapTermination(game.status);

    // Count moves
    const moveCount = this.countMovesFromString(game.moves);

    // Get rating change from player data
    const ratingChange = player.ratingDiff;

    // Extract clock data
    const clock = this.extractClockData(game, playerColor);

    // Extract analysis data
    const analysis = this.extractAnalysisData(game, player);

    return {
      id: game.id,
      source: 'lichess',
      playedAt: new Date(game.createdAt),
      timeClass,
      playerColor,
      result,
      opening,
      opponent: {
        username: opponent.user?.name || 'Anonymous',
        rating: opponent.rating ?? 0,
      },
      playerRating: player.rating ?? 0,
      termination,
      moveCount,
      ratingChange,
      rated: game.rated,
      gameUrl: `https://lichess.org/${game.id}`,
      clock,
      analysis,
    };
  }

  /**
   * Extract clock data from Lichess game
   */
  private extractClockData(
    game: LichessGame,
    playerColor: 'white' | 'black'
  ): ClockData | undefined {
    // If no clock data available, return undefined
    if (!game.clock) {
      return undefined;
    }

    const clockData: ClockData = {
      initialTime: game.clock.initial,
      increment: game.clock.increment,
    };

    // If we have the clocks array (time remaining per ply in centiseconds)
    if (game.clocks && game.clocks.length > 0) {
      // Extract player's clock times (every other entry starting at 0 for white, 1 for black)
      const startIndex = playerColor === 'white' ? 0 : 1;
      const playerClocks: number[] = [];
      
      for (let i = startIndex; i < game.clocks.length; i += 2) {
        playerClocks.push(game.clocks[i]);
      }

      if (playerClocks.length > 0) {
        // Time remaining at end (last entry in centiseconds, convert to seconds)
        clockData.timeRemaining = playerClocks[playerClocks.length - 1] / 100;

        // Calculate move times (time used per move)
        const moveTimes: number[] = [];
        let previousTime = game.clock.initial * 100; // Convert to centiseconds
        
        for (const clockTime of playerClocks) {
          // Time used = previous time - current time + increment
          const timeUsed = (previousTime - clockTime + game.clock.increment * 100) / 100;
          moveTimes.push(Math.max(0, timeUsed)); // Ensure non-negative
          previousTime = clockTime;
        }

        if (moveTimes.length > 0) {
          clockData.moveTimes = moveTimes;
          clockData.avgMoveTime = moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
        }
      }
    }

    return clockData;
  }

  /**
   * Extract analysis data from Lichess game
   */
  private extractAnalysisData(
    game: LichessGame,
    player: typeof game.players.white
  ): AnalysisData | undefined {
    // Check if player has analysis data
    if (!player.analysis) {
      return undefined;
    }

    return {
      accuracy: player.analysis.accuracy,
      blunders: player.analysis.blunder,
      mistakes: player.analysis.mistake,
      inaccuracies: player.analysis.inaccuracy,
      acpl: player.analysis.acpl,
    };
  }

  /**
   * Map time class string to TimeClass type
   */
  private mapTimeClass(speed: string): TimeClass {
    const normalized = speed.toLowerCase();
    if (normalized === 'bullet' || normalized === 'ultrabullet') return 'bullet';
    if (normalized === 'blitz') return 'blitz';
    if (normalized === 'rapid') return 'rapid';
    if (normalized === 'classical') return 'classical';
    // Default to rapid for unknown speeds (e.g., correspondence)
    // This prevents correspondence games from inflating classical stats
    return 'rapid';
  }

  /**
   * Map Lichess status to termination type
   */
  private mapTermination(status: string): TerminationType {
    const map: Record<string, TerminationType> = {
      mate: 'checkmate',
      resign: 'resignation',
      outoftime: 'timeout',
      timeout: 'timeout',
      stalemate: 'stalemate',
      draw: 'agreement',
      aborted: 'abandoned',
      noStart: 'abandoned',
      cheat: 'other',
      variantEnd: 'other',
    };
    return map[status] || 'other';
  }

  /**
   * Count moves from moves string
   */
  private countMovesFromString(moves: string | undefined): number {
    if (!moves) return 0;

    // Moves are space-separated, each pair is one full move
    const moveList = moves.trim().split(/\s+/);
    // Full moves = total half-moves / 2, rounded up
    return Math.ceil(moveList.length / 2);
  }
}
