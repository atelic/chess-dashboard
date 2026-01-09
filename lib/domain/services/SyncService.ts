import type { IGameRepository, IUserRepository } from '../repositories/interfaces';
import type { GameSource } from '../models/Game';
import type { IChessClient, FetchGamesOptions } from '@/lib/infrastructure/api-clients/types';
import { UserNotFoundError } from '@/lib/shared/errors';

// ============================================
// TYPES
// ============================================

export interface SyncOptions {
  /** If true, fetch all games regardless of last sync time */
  fullSync?: boolean;
}

export interface SyncSourceResult {
  source: GameSource;
  newGames: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  newGamesCount: number;
  totalGamesCount: number;
  sources: SyncSourceResult[];
}

// ============================================
// SERVICE
// ============================================

/**
 * Service for synchronizing games from chess platforms
 */
export class SyncService {
  constructor(
    private readonly gameRepository: IGameRepository,
    private readonly userRepository: IUserRepository,
    private readonly chessComClient: IChessClient,
    private readonly lichessClient: IChessClient,
  ) {}

  /**
   * Sync games from all configured platforms
   */
  async syncGames(userId: number, options: SyncOptions = {}): Promise<SyncResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const result: SyncResult = {
      success: true,
      newGamesCount: 0,
      totalGamesCount: 0,
      sources: [],
    };

    // Sync Chess.com if configured
    if (user.chesscomUsername) {
      const sourceResult = await this.syncSource(
        userId,
        user.chesscomUsername,
        this.chessComClient,
        options,
      );
      result.sources.push(sourceResult);
      result.newGamesCount += sourceResult.newGames;
      if (sourceResult.error) result.success = false;
    }

    // Sync Lichess if configured
    if (user.lichessUsername) {
      const sourceResult = await this.syncSource(
        userId,
        user.lichessUsername,
        this.lichessClient,
        options,
      );
      result.sources.push(sourceResult);
      result.newGamesCount += sourceResult.newGames;
      if (sourceResult.error) result.success = false;
    }

    // Update last synced timestamp if successful
    if (result.success) {
      await this.userRepository.updateLastSynced(userId, new Date());
    }

    // Get total count
    result.totalGamesCount = await this.gameRepository.count(userId);

    return result;
  }

  /**
   * Sync games from a single source
   */
  private async syncSource(
    userId: number,
    username: string,
    client: IChessClient,
    options: SyncOptions,
  ): Promise<SyncSourceResult> {
    try {
      // Determine fetch options
      const fetchOptions: FetchGamesOptions = {
        fetchAll: options.fullSync,
      };

      // For incremental sync, only fetch games newer than last sync
      if (!options.fullSync) {
        const latestDate = await this.gameRepository.getLatestGameDate(userId, client.source);
        if (latestDate) {
          // Add 1 second to avoid re-fetching the same game
          fetchOptions.since = new Date(latestDate.getTime() + 1000);
        }
      }

      // Fetch games from API
      const games = await client.fetchGames(username, fetchOptions);

      // Add userId to all games
      const gamesToSave = games.map((game) => ({ ...game, userId }));

      // Save games (upsert handles both new and existing games)
      // This ensures clock data and other fields are updated for existing games
      let newGamesCount = 0;
      if (gamesToSave.length > 0) {
        const beforeCount = await this.gameRepository.count(userId);
        await this.gameRepository.saveMany(gamesToSave);
        const afterCount = await this.gameRepository.count(userId);
        newGamesCount = afterCount - beforeCount;
      }

      return {
        source: client.source,
        newGames: newGamesCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Sync error for ${client.source}:`, error);
      return {
        source: client.source,
        newGames: 0,
        error: message,
      };
    }
  }

  /**
   * Delete all games for a user and re-sync from scratch
   */
  async fullResync(userId: number): Promise<SyncResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Delete all existing games
    await this.gameRepository.deleteByUser(userId);

    // Perform full sync
    return this.syncGames(userId, { fullSync: true });
  }
}
