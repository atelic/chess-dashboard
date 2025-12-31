import type { Game, TimeClass, TerminationType } from '@/lib/domain/models/Game';
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
}
