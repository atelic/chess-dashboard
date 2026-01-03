import type { IGameRepository, PaginationOptions, PaginatedResult } from '../repositories/interfaces';
import type { Game, PlayerColor, GameResult, AnalysisData } from '../models/Game';
import { GameFilter } from '../models/GameFilter';

// ============================================
// TYPES
// ============================================

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface OpeningStats {
  eco: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface OpponentStats {
  username: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgRating: number;
  lastPlayed: Date;
}

// ============================================
// SERVICE
// ============================================

/**
 * Service for game-related business logic
 */
export class GameService {
  constructor(private readonly gameRepository: IGameRepository) {}

  /**
   * Get all games for a user with optional filtering
   */
  async getGames(userId: number, filter?: GameFilter): Promise<Game[]> {
    return this.gameRepository.findAll(userId, filter);
  }

  async getGamesPaginated(
    userId: number, 
    filter?: GameFilter, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Game>> {
    return this.gameRepository.findPaginated(userId, filter, pagination);
  }

  /**
   * Get games by ECO code, optionally filtered by color and result
   */
  async getGamesByEco(
    userId: number,
    eco: string,
    options?: { color?: PlayerColor; result?: GameResult },
  ): Promise<Game[]> {
    let filter = GameFilter.empty().withOpenings([eco]);

    if (options?.color) {
      filter = filter.withColors([options.color]);
    }
    if (options?.result) {
      filter = filter.withResults([options.result]);
    }

    return this.gameRepository.findAll(userId, filter);
  }

  /**
   * Get games against a specific opponent
   */
  async getGamesByOpponent(userId: number, opponent: string): Promise<Game[]> {
    return this.gameRepository.findByOpponent(userId, opponent);
  }

  /**
   * Get game count
   */
  async getGameCount(userId: number, filter?: GameFilter): Promise<number> {
    return this.gameRepository.count(userId, filter);
  }

  /**
   * Calculate stats for a set of games
   */
  async getStats(userId: number, filter?: GameFilter): Promise<GameStats> {
    const games = await this.gameRepository.findAll(userId, filter);
    return this.calculateStats(games);
  }

  /**
   * Get opening statistics
   */
  async getOpeningStats(
    userId: number,
    color?: PlayerColor,
    minGames: number = 1,
  ): Promise<OpeningStats[]> {
    let filter = GameFilter.empty();
    if (color) {
      filter = filter.withColors([color]);
    }

    const games = await this.gameRepository.findAll(userId, filter);
    return this.calculateOpeningStats(games, minGames);
  }

  /**
   * Get opponent statistics
   */
  async getOpponentStats(userId: number, minGames: number = 1): Promise<OpponentStats[]> {
    const games = await this.gameRepository.findAll(userId);
    return this.calculateOpponentStats(games, minGames);
  }

  /**
   * Update analysis data for a game
   */
  async updateGameAnalysis(gameId: string, analysis: AnalysisData): Promise<void> {
    return this.gameRepository.updateAnalysis(gameId, analysis);
  }

  // ============================================
  // CALCULATION HELPERS
  // ============================================

  private calculateStats(games: Game[]): GameStats {
    const wins = games.filter((g) => g.result === 'win').length;
    const losses = games.filter((g) => g.result === 'loss').length;
    const draws = games.filter((g) => g.result === 'draw').length;
    const total = games.length;

    return {
      totalGames: total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? (wins / total) * 100 : 0,
    };
  }

  private calculateOpeningStats(games: Game[], minGames: number): OpeningStats[] {
    const openingMap = new Map<
      string,
      { name: string; wins: number; losses: number; draws: number }
    >();

    for (const game of games) {
      const eco = game.opening.eco;
      const current = openingMap.get(eco) || {
        name: game.opening.name,
        wins: 0,
        losses: 0,
        draws: 0,
      };

      if (game.result === 'win') current.wins++;
      else if (game.result === 'loss') current.losses++;
      else current.draws++;

      openingMap.set(eco, current);
    }

    const stats: OpeningStats[] = [];
    for (const [eco, data] of openingMap) {
      const total = data.wins + data.losses + data.draws;
      if (total >= minGames) {
        stats.push({
          eco,
          name: data.name,
          games: total,
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          winRate: total > 0 ? (data.wins / total) * 100 : 0,
        });
      }
    }

    return stats.sort((a, b) => b.games - a.games);
  }

  private calculateOpponentStats(games: Game[], minGames: number): OpponentStats[] {
    const opponentMap = new Map<
      string,
      {
        wins: number;
        losses: number;
        draws: number;
        totalRating: number;
        lastPlayed: Date;
      }
    >();

    for (const game of games) {
      const opponent = game.opponent.username.toLowerCase();
      const current = opponentMap.get(opponent) || {
        wins: 0,
        losses: 0,
        draws: 0,
        totalRating: 0,
        lastPlayed: game.playedAt,
      };

      if (game.result === 'win') current.wins++;
      else if (game.result === 'loss') current.losses++;
      else current.draws++;
      current.totalRating += game.opponent.rating;
      if (game.playedAt > current.lastPlayed) {
        current.lastPlayed = game.playedAt;
      }

      opponentMap.set(opponent, current);
    }

    const stats: OpponentStats[] = [];
    for (const [username, data] of opponentMap) {
      const total = data.wins + data.losses + data.draws;
      if (total >= minGames) {
        stats.push({
          username,
          games: total,
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          winRate: total > 0 ? (data.wins / total) * 100 : 0,
          avgRating: Math.round(data.totalRating / total),
          lastPlayed: data.lastPlayed,
        });
      }
    }

    return stats.sort((a, b) => b.games - a.games);
  }
}
