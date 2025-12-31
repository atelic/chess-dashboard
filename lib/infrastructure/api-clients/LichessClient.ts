import type { Game, TimeClass, TerminationType } from '@/lib/domain/models/Game';
import type { IChessClient, FetchGamesOptions, LichessGame } from './types';
import { ExternalApiError, InvalidUsernameError, RateLimitError } from '@/lib/shared/errors';

const BASE_URL = 'https://lichess.org/api';

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
      moves: 'true', // Need moves to count them
    });

    // Set max - if fetchAll, use a very high number (Lichess will return all)
    if (!fetchAll) {
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
        rating: opponent.rating,
      },
      playerRating: player.rating,
      termination,
      moveCount,
      ratingChange,
      rated: game.rated,
      gameUrl: `https://lichess.org/${game.id}`,
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
    return 'classical';
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
