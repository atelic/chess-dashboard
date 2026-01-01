import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '@/lib/domain/services/SyncService';
import type { IGameRepository, IUserRepository } from '@/lib/domain/repositories/interfaces';
import type { IChessClient } from '@/lib/infrastructure/api-clients/types';
import { UserNotFoundError } from '@/lib/shared/errors';
import { createTestUser, createChessComOnlyUser, createLichessOnlyUser } from '@/__tests__/fixtures/user';
import { createTestGame, createLichessGame } from '@/__tests__/fixtures/game';

describe('SyncService', () => {
  const mockGameRepo: IGameRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByEco: vi.fn(),
    findByOpponent: vi.fn(),
    count: vi.fn(),
    existsById: vi.fn(),
    getLatestGameDate: vi.fn(),
    findGamesNeedingAnalysis: vi.fn(),
    save: vi.fn(),
    saveMany: vi.fn(),
    deleteByUser: vi.fn(),
    updateAnalysis: vi.fn(),
  };

  const mockUserRepo: IUserRepository = {
    findById: vi.fn(),
    findFirst: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateLastSynced: vi.fn(),
    delete: vi.fn(),
  };

  const mockChessComClient: IChessClient = {
    source: 'chesscom',
    validateUser: vi.fn(),
    fetchGames: vi.fn(),
  };

  const mockLichessClient: IChessClient = {
    source: 'lichess',
    validateUser: vi.fn(),
    fetchGames: vi.fn(),
  };

  let service: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SyncService(
      mockGameRepo,
      mockUserRepo,
      mockChessComClient,
      mockLichessClient
    );
  });

  describe('syncGames()', () => {
    it('should throw UserNotFoundError for non-existent user', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.syncGames(999)).rejects.toThrow(UserNotFoundError);
    });

    it('should sync both platforms when both configured', async () => {
      const user = createTestUser({
        id: 1,
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });
      const chessComGames = [createTestGame({ id: 'chess-1' })];
      const lichessGames = [createLichessGame({ id: 'lichess-1' })];

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue(chessComGames);
      vi.mocked(mockLichessClient.fetchGames).mockResolvedValue(lichessGames);
      vi.mocked(mockGameRepo.count).mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(mockChessComClient.fetchGames).toHaveBeenCalledWith('chessuser', expect.any(Object));
      expect(mockLichessClient.fetchGames).toHaveBeenCalledWith('lichessuser', expect.any(Object));
      expect(result.sources.length).toBe(2);
    });

    it('should sync only Chess.com when only chesscom configured', async () => {
      const user = createChessComOnlyUser({ id: 1 });
      const games = [createTestGame()];

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue(games);
      vi.mocked(mockGameRepo.count).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(mockChessComClient.fetchGames).toHaveBeenCalled();
      expect(mockLichessClient.fetchGames).not.toHaveBeenCalled();
      expect(result.sources.length).toBe(1);
      expect(result.sources[0].source).toBe('chesscom');
    });

    it('should sync only Lichess when only lichess configured', async () => {
      const user = createLichessOnlyUser({ id: 1 });
      const games = [createLichessGame()];

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockLichessClient.fetchGames).mockResolvedValue(games);
      vi.mocked(mockGameRepo.count).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(mockLichessClient.fetchGames).toHaveBeenCalled();
      expect(mockChessComClient.fetchGames).not.toHaveBeenCalled();
      expect(result.sources.length).toBe(1);
      expect(result.sources[0].source).toBe('lichess');
    });

    it('should perform incremental sync by default', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockGameRepo.getLatestGameDate).mockResolvedValue(new Date('2024-06-01'));
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(10);

      await service.syncGames(1);

      const fetchCall = vi.mocked(mockChessComClient.fetchGames).mock.calls[0];
      expect(fetchCall[1]?.fetchAll).toBeFalsy();
    });

    it('should fetch since last game date for incremental sync', async () => {
      const user = createChessComOnlyUser({ id: 1 });
      const lastGameDate = new Date('2024-06-01T10:00:00Z');

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockGameRepo.getLatestGameDate).mockResolvedValue(lastGameDate);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(10);

      await service.syncGames(1);

      const fetchCall = vi.mocked(mockChessComClient.fetchGames).mock.calls[0];
      expect(fetchCall[1]?.since).toBeDefined();
      // Should be 1 second after the last game
      expect(fetchCall[1]?.since?.getTime()).toBe(lastGameDate.getTime() + 1000);
    });

    it('should perform full sync when fullSync option is true', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(10);

      await service.syncGames(1, { fullSync: true });

      const fetchCall = vi.mocked(mockChessComClient.fetchGames).mock.calls[0];
      expect(fetchCall[1]?.fetchAll).toBe(true);
    });

    it('should save fetched games to repository', async () => {
      const user = createChessComOnlyUser({ id: 1 });
      const games = [createTestGame({ id: 'game-1' }), createTestGame({ id: 'game-2' })];

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue(games);
      vi.mocked(mockGameRepo.count).mockResolvedValueOnce(0).mockResolvedValueOnce(2);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(2);

      await service.syncGames(1);

      expect(mockGameRepo.saveMany).toHaveBeenCalled();
      const savedGames = vi.mocked(mockGameRepo.saveMany).mock.calls[0][0];
      expect(savedGames.length).toBe(2);
      // Games should have userId added
      expect(savedGames[0].userId).toBe(1);
    });

    it('should update lastSyncedAt on success', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(0);

      await service.syncGames(1);

      expect(mockUserRepo.updateLastSynced).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should not update lastSyncedAt on failure', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockRejectedValue(new Error('API error'));
      vi.mocked(mockGameRepo.count).mockResolvedValue(0);

      await service.syncGames(1);

      expect(mockUserRepo.updateLastSynced).not.toHaveBeenCalled();
    });

    it('should return correct newGamesCount', async () => {
      const user = createChessComOnlyUser({ id: 1 });
      const games = [createTestGame()];

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue(games);
      vi.mocked(mockGameRepo.count)
        .mockResolvedValueOnce(5) // before save
        .mockResolvedValueOnce(6); // after save (total)
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(result.newGamesCount).toBe(1);
    });

    it('should return correct totalGamesCount', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(42);

      const result = await service.syncGames(1);

      expect(result.totalGamesCount).toBe(42);
    });

    it('should return source-level results', async () => {
      const user = createTestUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([createTestGame()]);
      vi.mocked(mockLichessClient.fetchGames).mockResolvedValue([createLichessGame()]);
      vi.mocked(mockGameRepo.count)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(1) // chesscom
        .mockResolvedValueOnce(1).mockResolvedValueOnce(2) // lichess
        .mockResolvedValueOnce(2); // total
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(result.sources.length).toBe(2);
      expect(result.sources.find((s) => s.source === 'chesscom')?.newGames).toBe(1);
      expect(result.sources.find((s) => s.source === 'lichess')?.newGames).toBe(1);
    });

    it('should handle Chess.com API error gracefully', async () => {
      const user = createTestUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockRejectedValue(new Error('Chess.com down'));
      vi.mocked(mockLichessClient.fetchGames).mockResolvedValue([createLichessGame()]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(1);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(result.success).toBe(false);
      const chesscomResult = result.sources.find((s) => s.source === 'chesscom');
      expect(chesscomResult?.error).toBeDefined();
    });

    it('should handle Lichess API error gracefully', async () => {
      const user = createTestUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([createTestGame()]);
      vi.mocked(mockLichessClient.fetchGames).mockRejectedValue(new Error('Lichess down'));
      vi.mocked(mockGameRepo.count).mockResolvedValue(1);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      expect(result.success).toBe(false);
      const lichessResult = result.sources.find((s) => s.source === 'lichess');
      expect(lichessResult?.error).toBeDefined();
    });

    it('should continue syncing other sources on one failure', async () => {
      const user = createTestUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockChessComClient.fetchGames).mockRejectedValue(new Error('API error'));
      vi.mocked(mockLichessClient.fetchGames).mockResolvedValue([createLichessGame()]);
      vi.mocked(mockGameRepo.count)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      const result = await service.syncGames(1);

      // Lichess should still have synced
      const lichessResult = result.sources.find((s) => s.source === 'lichess');
      expect(lichessResult?.newGames).toBe(1);
      expect(lichessResult?.error).toBeUndefined();
    });
  });

  describe('fullResync()', () => {
    it('should delete all existing games', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockGameRepo.deleteByUser).mockResolvedValue(10);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([]);
      vi.mocked(mockGameRepo.count).mockResolvedValue(0);

      await service.fullResync(1);

      expect(mockGameRepo.deleteByUser).toHaveBeenCalledWith(1);
    });

    it('should perform full sync after delete', async () => {
      const user = createChessComOnlyUser({ id: 1 });

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockGameRepo.deleteByUser).mockResolvedValue(0);
      vi.mocked(mockChessComClient.fetchGames).mockResolvedValue([createTestGame()]);
      vi.mocked(mockGameRepo.count)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      vi.mocked(mockGameRepo.saveMany).mockResolvedValue(1);

      await service.fullResync(1);

      const fetchCall = vi.mocked(mockChessComClient.fetchGames).mock.calls[0];
      expect(fetchCall[1]?.fetchAll).toBe(true);
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.fullResync(999)).rejects.toThrow(UserNotFoundError);
    });
  });
});
