import type { Game, TimeClass, TerminationType, ClockData, AnalysisData } from '@/lib/domain/models/Game';
import type {
  IChessClient,
  FetchGamesOptions,
  ChessComArchivesResponse,
  ChessComGamesResponse,
  ChessComGame,
} from './types';
import { ExternalApiError, InvalidUsernameError, RateLimitError } from '@/lib/shared/errors';

const BASE_URL = 'https://api.chess.com/pub';

/**
 * Result of fetching game analysis from Chess.com
 */
export interface ChessComGameAnalysis {
  accuracy?: number;
}

/**
 * Fetch analysis data for a single Chess.com game
 * Returns null if the game hasn't been analyzed on Chess.com (user needs to request Game Review first)
 * 
 * Note: Chess.com doesn't have a single-game endpoint, so we fetch the monthly archive
 * and find the specific game by URL
 */
export async function fetchChessComGameAnalysis(
  username: string,
  gameUrl: string,
  gameDate: Date,
  playerColor: 'white' | 'black'
): Promise<ChessComGameAnalysis | null> {
  try {
    // Construct the archive URL from the game date
    const year = gameDate.getFullYear();
    const month = String(gameDate.getMonth() + 1).padStart(2, '0');
    const archiveUrl = `${BASE_URL}/player/${username.toLowerCase()}/games/${year}/${month}`;

    const response = await fetch(archiveUrl);

    if (!response.ok) {
      console.error(`Failed to fetch Chess.com archive: ${response.status}`);
      return null;
    }

    const data: { games: ChessComGame[] } = await response.json();
    
    // Find the specific game by URL
    const game = data.games?.find(g => g.url === gameUrl);
    
    if (!game) {
      console.error(`Game not found in archive: ${gameUrl}`);
      return null;
    }

    // Check if accuracies are available
    if (!game.accuracies) {
      return null;
    }

    return {
      accuracy: playerColor === 'white' ? game.accuracies.white : game.accuracies.black,
    };
  } catch (error) {
    console.error('Error fetching Chess.com game analysis:', error);
    return null;
  }
}

/**
 * Fetch a Chess.com monthly archive once and return a lookup map
 * Used for bulk fetching to avoid redundant API calls
 */
export async function fetchChessComMonthlyArchive(
  username: string,
  year: number,
  month: number
): Promise<Map<string, ChessComGame> | null> {
  try {
    const monthStr = String(month).padStart(2, '0');
    const archiveUrl = `${BASE_URL}/player/${username.toLowerCase()}/games/${year}/${monthStr}`;

    const response = await fetch(archiveUrl);

    if (!response.ok) {
      console.error(`Failed to fetch Chess.com archive: ${response.status}`);
      return null;
    }

    const data: { games: ChessComGame[] } = await response.json();
    
    // Create a map keyed by game URL for fast lookups
    const gameMap = new Map<string, ChessComGame>();
    for (const game of data.games || []) {
      gameMap.set(game.url, game);
    }
    
    return gameMap;
  } catch (error) {
    console.error('Error fetching Chess.com monthly archive:', error);
    return null;
  }
}

/**
 * Extract analysis from a pre-fetched game
 */
export function extractChessComAnalysis(
  game: ChessComGame,
  playerColor: 'white' | 'black'
): ChessComGameAnalysis | null {
  if (!game.accuracies) {
    return null;
  }
  return {
    accuracy: playerColor === 'white' ? game.accuracies.white : game.accuracies.black,
  };
}

/**
 * Chess.com API client for fetching games
 */
export class ChessComClient implements IChessClient {
  readonly source = 'chesscom' as const;

  /**
   * Validate that a Chess.com user exists
   */
  async validateUser(username: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/player/${username.toLowerCase()}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch games from Chess.com
   */
  async fetchGames(username: string, options: FetchGamesOptions = {}): Promise<Game[]> {
    const { maxGames = 100, since, until, fetchAll = false } = options;

    // Get all archives
    const archives = await this.fetchArchives(username);

    if (archives.length === 0) {
      return [];
    }

    // Fetch archives in reverse order (most recent first)
    const reversedArchives = [...archives].reverse();
    const allGames: Game[] = [];

    for (const archiveUrl of reversedArchives) {
      // Check if we have enough games (unless fetchAll is true)
      if (!fetchAll && allGames.length >= maxGames) {
        break;
      }

      // Check if archive is within date range (rough check based on URL)
      // URL format: https://api.chess.com/pub/player/{user}/games/{YYYY}/{MM}
      if (since || until) {
        const urlParts = archiveUrl.split('/');
        const year = parseInt(urlParts[urlParts.length - 2]);
        const month = parseInt(urlParts[urlParts.length - 1]);
        const archiveDate = new Date(year, month - 1);

        if (until && archiveDate > until) {
          continue; // Skip future archives
        }

        // Create end of month date for comparison
        const archiveEndDate = new Date(year, month, 0);
        if (since && archiveEndDate < since) {
          break; // Stop if we've gone past the start date
        }
      }

      try {
        const games = await this.fetchArchiveGames(archiveUrl);

        // Convert games and filter by date if needed
        for (const game of games.reverse()) {
          // Reverse to get newest first
          const converted = this.convertGame(game, username);

          // Apply date filters
          if (since && converted.playedAt < since) continue;
          if (until && converted.playedAt > until) continue;

          allGames.push(converted);

          // Check max games limit (unless fetchAll)
          if (!fetchAll && allGames.length >= maxGames) {
            break;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch archive ${archiveUrl}:`, error);
        // Continue with other archives
      }
    }

    // Sort by date descending
    return allGames.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Fetch game archives list for a user
   */
  private async fetchArchives(username: string): Promise<string[]> {
    const response = await fetch(
      `${BASE_URL}/player/${username.toLowerCase()}/games/archives`,
    );

    if (response.status === 404) {
      throw new InvalidUsernameError('Chess.com', username);
    }

    if (response.status === 429) {
      throw new RateLimitError('Chess.com');
    }

    if (!response.ok) {
      throw new ExternalApiError('Chess.com');
    }

    const data: ChessComArchivesResponse = await response.json();
    return data.archives;
  }

  /**
   * Fetch games from a single archive URL
   */
  private async fetchArchiveGames(archiveUrl: string): Promise<ChessComGame[]> {
    const response = await fetch(archiveUrl);

    if (response.status === 429) {
      throw new RateLimitError('Chess.com');
    }

    if (!response.ok) {
      throw new ExternalApiError('Chess.com');
    }

    const data: ChessComGamesResponse = await response.json();
    return data.games || [];
  }

  /**
   * Convert a Chess.com game to our unified Game type
   */
  private convertGame(game: ChessComGame, username: string): Game {
    const normalizedUsername = username.toLowerCase();
    const isWhite = game.white.username.toLowerCase() === normalizedUsername;
    const playerColor = isWhite ? 'white' : 'black';
    const player = isWhite ? game.white : game.black;
    const opponent = isWhite ? game.black : game.white;

    // Determine result from the player's perspective
    const result = this.mapResult(player.result);

    // Parse opening from PGN
    const opening = this.parseOpeningFromPgn(game.pgn || '');

    // Map time class
    const timeClass = this.mapTimeClass(game.time_class);

    // Determine termination from both results
    const termination = this.determineTermination(game.white.result, game.black.result);

    // Count moves
    const moveCount = this.countMovesFromPgn(game.pgn || '');

    // Extract clock data from time_control and PGN
    const clock = this.extractClockData(game.time_control, game.pgn || '', playerColor);

    // Extract analysis data if available (user must have requested Game Review on Chess.com)
    const playerAccuracy = game.accuracies 
      ? (playerColor === 'white' ? game.accuracies.white : game.accuracies.black)
      : undefined;
    const analysis: AnalysisData | undefined = playerAccuracy !== undefined && playerAccuracy > 0
      ? {
          accuracy: playerAccuracy,
          blunders: 0, // Not available from Chess.com API
          mistakes: 0, // Not available from Chess.com API
          inaccuracies: 0, // Not available from Chess.com API
        }
      : undefined;

    return {
      id: game.url.split('/').pop() || game.url,
      source: 'chesscom',
      playedAt: new Date(game.end_time * 1000),
      timeClass,
      playerColor,
      result,
      opening,
      opponent: {
        username: opponent.username,
        rating: opponent.rating,
      },
      playerRating: player.rating,
      termination,
      moveCount,
      ratingChange: undefined, // Chess.com doesn't provide this in the API
      rated: game.rated,
      gameUrl: game.url,
      clock,
      analysis,
      pgn: game.pgn || undefined,
    };
  }

  /**
   * Map Chess.com result string to our result type
   */
  private mapResult(result: string): 'win' | 'loss' | 'draw' {
    const winResults = ['win'];
    const lossResults = [
      'checkmated',
      'timeout',
      'resigned',
      'lose',
      'abandoned',
      'kingofthehill',
      'threecheck',
      'bughousepartnerlose',
    ];

    if (winResults.includes(result)) return 'win';
    if (lossResults.includes(result)) return 'loss';
    return 'draw';
  }

  /**
   * Map time class string to TimeClass type
   */
  private mapTimeClass(timeClass: string): TimeClass {
    const normalized = timeClass.toLowerCase();
    if (normalized === 'bullet' || normalized === 'ultrabullet') return 'bullet';
    if (normalized === 'blitz') return 'blitz';
    if (normalized === 'rapid') return 'rapid';
    return 'classical';
  }

  /**
   * Parse opening info from PGN
   */
  private parseOpeningFromPgn(pgn: string): { eco: string; name: string } {
    const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
    const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);

    return {
      eco: ecoMatch?.[1] || 'Unknown',
      name: openingMatch?.[1] || 'Unknown Opening',
    };
  }

  /**
   * Determine termination from both players' results
   */
  private determineTermination(whiteResult: string, blackResult: string): TerminationType {
    if (whiteResult === 'checkmated' || blackResult === 'checkmated') {
      return 'checkmate';
    }
    if (whiteResult === 'timeout' || blackResult === 'timeout') {
      return 'timeout';
    }
    if (whiteResult === 'resigned' || blackResult === 'resigned') {
      return 'resignation';
    }
    if (whiteResult === 'stalemate' || blackResult === 'stalemate') {
      return 'stalemate';
    }
    if (whiteResult === 'insufficient' || blackResult === 'insufficient') {
      return 'insufficient';
    }
    if (whiteResult === 'repetition' || blackResult === 'repetition') {
      return 'repetition';
    }
    if (
      whiteResult === 'agreed' ||
      blackResult === 'agreed' ||
      whiteResult === '50move' ||
      blackResult === '50move'
    ) {
      return 'agreement';
    }
    if (whiteResult === 'abandoned' || blackResult === 'abandoned') {
      return 'abandoned';
    }
    if (whiteResult === 'timevsinsufficient' || blackResult === 'timevsinsufficient') {
      return 'timeout';
    }

    return 'other';
  }

  /**
   * Count moves from PGN
   */
  private countMovesFromPgn(pgn: string): number {
    if (!pgn) return 0;

    // Find all move numbers (e.g., "1.", "2.", etc.)
    const moveMatches = pgn.match(/\d+\./g);
    if (!moveMatches) return 0;

    // Get the highest move number
    const moveNumbers = moveMatches.map((m) => parseInt(m.replace('.', '')));
    return Math.max(...moveNumbers, 0);
  }

  /**
   * Parse time control string (e.g., "300", "300+5", "1/86400")
   */
  private parseTimeControl(timeControl: string): { initialTime: number; increment: number } | null {
    if (!timeControl) return null;

    // Daily chess format: "1/86400" (1 day per move)
    if (timeControl.includes('/')) {
      // For daily chess, we don't track clock data the same way
      return null;
    }

    // Live chess format: "300" or "300+5"
    if (timeControl.includes('+')) {
      const [initial, increment] = timeControl.split('+');
      return {
        initialTime: parseInt(initial, 10),
        increment: parseInt(increment, 10),
      };
    }

    // Just initial time, no increment
    return {
      initialTime: parseInt(timeControl, 10),
      increment: 0,
    };
  }

  /**
   * Extract clock times from PGN
   * Chess.com PGN includes clock annotations like: {[%clk 0:04:58]}
   */
  private extractClockTimesFromPgn(
    pgn: string,
    playerColor: 'white' | 'black'
  ): number[] {
    if (!pgn) return [];

    // Match clock annotations: {[%clk H:MM:SS]} or {[%clk M:SS]}
    const clockRegex = /\{[^}]*\[%clk\s+(\d+):(\d+):?(\d+)?\][^}]*\}/g;
    const allClocks: { time: number; isWhite: boolean }[] = [];

    // Find all moves with clock annotations
    // PGN format: "1. e4 {[%clk 0:04:58]} e5 {[%clk 0:04:57]} 2. Nf3 ..."
    let match;
    let moveIndex = 0;

    while ((match = clockRegex.exec(pgn)) !== null) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = match[3] ? parseInt(match[3], 10) : 0;

      // Handle H:MM:SS vs M:SS format
      let totalSeconds: number;
      if (match[3]) {
        // H:MM:SS format
        totalSeconds = hours * 3600 + minutes * 60 + seconds;
      } else {
        // M:SS format (hours is actually minutes, minutes is actually seconds)
        totalSeconds = hours * 60 + minutes;
      }

      // Alternate between white and black moves
      // First clock in a move pair is white, second is black
      allClocks.push({
        time: totalSeconds,
        isWhite: moveIndex % 2 === 0,
      });
      moveIndex++;
    }

    // Filter to get only the player's clocks
    const playerClocks = allClocks
      .filter((c) => c.isWhite === (playerColor === 'white'))
      .map((c) => c.time);

    return playerClocks;
  }

  /**
   * Extract clock data from time control and PGN
   */
  private extractClockData(
    timeControl: string,
    pgn: string,
    playerColor: 'white' | 'black'
  ): ClockData | undefined {
    // Parse the time control first
    const parsed = this.parseTimeControl(timeControl);
    if (!parsed) {
      return undefined;
    }

    const clockData: ClockData = {
      initialTime: parsed.initialTime,
      increment: parsed.increment,
    };

    // Try to extract clock times from PGN
    const playerClocks = this.extractClockTimesFromPgn(pgn, playerColor);

    if (playerClocks.length > 0) {
      // Time remaining at end of game
      clockData.timeRemaining = playerClocks[playerClocks.length - 1];

      // Calculate move times (time spent per move)
      const moveTimes: number[] = [];
      let previousTime = parsed.initialTime;

      for (const clockTime of playerClocks) {
        // Time used = previous time - current time + increment
        const timeUsed = previousTime - clockTime + parsed.increment;
        moveTimes.push(Math.max(0, timeUsed)); // Ensure non-negative
        previousTime = clockTime;
      }

      if (moveTimes.length > 0) {
        clockData.moveTimes = moveTimes;
        clockData.avgMoveTime = moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
      }
    }

    return clockData;
  }
}
