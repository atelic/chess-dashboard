import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from '@/lib/domain/services/GameService';
import type { IGameRepository } from '@/lib/domain/repositories/interfaces';
import { GameFilter } from '@/lib/domain/models/GameFilter';
import {
  createTestGame,
  createTestGames,
  createMixedResultGames,
  createVariedOpeningGames,
  createVariedOpponentGames,
} from '@/__tests__/fixtures/game';

describe('GameService', () => {
  const mockGameRepo: IGameRepository = {
    findAll: vi.fn(),
    findPaginated: vi.fn(),
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

  let service: GameService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GameService(mockGameRepo);
  });

  describe('getGames()', () => {
    it('should return all games when no filter provided', async () => {
      const games = createTestGames(5);
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const result = await service.getGames(1);

      expect(result).toEqual(games);
      expect(mockGameRepo.findAll).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass filter to repository when provided', async () => {
      const filter = GameFilter.empty().withTimeClasses(['blitz']);
      const games = createTestGames(3, () => ({ timeClass: 'blitz' }));
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const result = await service.getGames(1, filter);

      expect(result).toEqual(games);
      expect(mockGameRepo.findAll).toHaveBeenCalledWith(1, filter);
    });

    it('should return empty array when no games match', async () => {
      vi.mocked(mockGameRepo.findAll).mockResolvedValue([]);

      const result = await service.getGames(1);

      expect(result).toEqual([]);
    });
  });

  describe('getGamesByEco()', () => {
    it('should filter by ECO code', async () => {
      const games = createTestGames(3, () => ({
        opening: { eco: 'B20', name: 'Sicilian Defense' },
      }));
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const result = await service.getGamesByEco(1, 'B20');

      expect(result).toEqual(games);
      // Verify the filter was created correctly
      const call = vi.mocked(mockGameRepo.findAll).mock.calls[0];
      expect(call[0]).toBe(1);
      expect(call[1]).toBeInstanceOf(GameFilter);
      expect((call[1] as GameFilter).openings).toContain('B20');
    });

    it('should filter by ECO code and color', async () => {
      const games = createTestGames(2);
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      await service.getGamesByEco(1, 'B20', { color: 'white' });

      const call = vi.mocked(mockGameRepo.findAll).mock.calls[0];
      const filter = call[1] as GameFilter;
      expect(filter.openings).toContain('B20');
      expect(filter.colors).toContain('white');
    });

    it('should filter by ECO code, color, and result', async () => {
      const games = createTestGames(2);
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      await service.getGamesByEco(1, 'C50', { color: 'black', result: 'win' });

      const call = vi.mocked(mockGameRepo.findAll).mock.calls[0];
      const filter = call[1] as GameFilter;
      expect(filter.openings).toContain('C50');
      expect(filter.colors).toContain('black');
      expect(filter.results).toContain('win');
    });
  });

  describe('getGamesByOpponent()', () => {
    it('should call repository with opponent filter', async () => {
      const games = createTestGames(3);
      vi.mocked(mockGameRepo.findByOpponent).mockResolvedValue(games);

      const result = await service.getGamesByOpponent(1, 'opponent123');

      expect(result).toEqual(games);
      expect(mockGameRepo.findByOpponent).toHaveBeenCalledWith(1, 'opponent123');
    });

    it('should return empty array when no games against opponent', async () => {
      vi.mocked(mockGameRepo.findByOpponent).mockResolvedValue([]);

      const result = await service.getGamesByOpponent(1, 'unknownplayer');

      expect(result).toEqual([]);
    });
  });

  describe('getGameCount()', () => {
    it('should return total game count', async () => {
      vi.mocked(mockGameRepo.count).mockResolvedValue(42);

      const result = await service.getGameCount(1);

      expect(result).toBe(42);
      expect(mockGameRepo.count).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass filter to count query', async () => {
      const filter = GameFilter.empty().withResults(['win']);
      vi.mocked(mockGameRepo.count).mockResolvedValue(10);

      const result = await service.getGameCount(1, filter);

      expect(result).toBe(10);
      expect(mockGameRepo.count).toHaveBeenCalledWith(1, filter);
    });
  });

  describe('getStats()', () => {
    it('should calculate correct win/loss/draw counts', async () => {
      const games = createMixedResultGames(); // 3 wins, 2 losses, 1 draw
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getStats(1);

      expect(stats.totalGames).toBe(6);
      expect(stats.wins).toBe(3);
      expect(stats.losses).toBe(2);
      expect(stats.draws).toBe(1);
    });

    it('should calculate correct win rate', async () => {
      const games = createMixedResultGames(); // 3 wins out of 6 = 50%
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getStats(1);

      expect(stats.winRate).toBe(50);
    });

    it('should handle empty games array', async () => {
      vi.mocked(mockGameRepo.findAll).mockResolvedValue([]);

      const stats = await service.getStats(1);

      expect(stats.totalGames).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(0);
      expect(stats.winRate).toBe(0);
    });

    it('should handle all wins', async () => {
      const games = createTestGames(5, () => ({ result: 'win' }));
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getStats(1);

      expect(stats.wins).toBe(5);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(0);
      expect(stats.winRate).toBe(100);
    });

    it('should handle all losses', async () => {
      const games = createTestGames(5, () => ({ result: 'loss' }));
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getStats(1);

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(5);
      expect(stats.winRate).toBe(0);
    });

    it('should respect filter when calculating stats', async () => {
      const filter = GameFilter.empty().withTimeClasses(['blitz']);
      vi.mocked(mockGameRepo.findAll).mockResolvedValue([]);

      await service.getStats(1, filter);

      expect(mockGameRepo.findAll).toHaveBeenCalledWith(1, filter);
    });
  });

  describe('getOpeningStats()', () => {
    it('should aggregate by opening', async () => {
      const games = createVariedOpeningGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpeningStats(1);

      expect(stats.length).toBeGreaterThan(0);
      
      const sicilian = stats.find((s) => s.eco === 'B20');
      expect(sicilian).toBeDefined();
      expect(sicilian?.games).toBe(3);
      expect(sicilian?.wins).toBe(2);
      expect(sicilian?.losses).toBe(1);
    });

    it('should filter by minGames threshold', async () => {
      const games = createVariedOpeningGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpeningStats(1, undefined, 2);

      // Only openings with 2+ games should be included
      stats.forEach((s) => {
        expect(s.games).toBeGreaterThanOrEqual(2);
      });
    });

    it('should calculate correct win rates per opening', async () => {
      const games = createVariedOpeningGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpeningStats(1);

      const sicilian = stats.find((s) => s.eco === 'B20');
      // 2 wins out of 3 games = 66.67%
      expect(sicilian?.winRate).toBeCloseTo(66.67, 1);
    });

    it('should sort by game count descending', async () => {
      const games = createVariedOpeningGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpeningStats(1);

      for (let i = 1; i < stats.length; i++) {
        expect(stats[i - 1].games).toBeGreaterThanOrEqual(stats[i].games);
      }
    });

    it('should filter by color when specified', async () => {
      vi.mocked(mockGameRepo.findAll).mockResolvedValue([]);

      await service.getOpeningStats(1, 'white');

      const call = vi.mocked(mockGameRepo.findAll).mock.calls[0];
      const filter = call[1] as GameFilter;
      expect(filter.colors).toContain('white');
    });
  });

  describe('getOpponentStats()', () => {
    it('should aggregate by opponent (case insensitive)', async () => {
      const games = createVariedOpponentGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpponentStats(1);

      // player1 and Player1 should be combined
      const player1 = stats.find((s) => s.username === 'player1');
      expect(player1).toBeDefined();
      expect(player1?.games).toBe(3);
    });

    it('should calculate average opponent rating', async () => {
      const games = createVariedOpponentGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpponentStats(1);

      const player1 = stats.find((s) => s.username === 'player1');
      // Ratings: 1500, 1520, 1510 -> avg = 1510
      expect(player1?.avgRating).toBe(1510);
    });

    it('should track last played date', async () => {
      const games = [
        createTestGame({
          id: 'old',
          opponent: { username: 'player1', rating: 1500 },
          playedAt: new Date('2024-01-01'),
        }),
        createTestGame({
          id: 'new',
          opponent: { username: 'player1', rating: 1500 },
          playedAt: new Date('2024-06-15'),
        }),
      ];
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpponentStats(1);

      const player1 = stats.find((s) => s.username === 'player1');
      expect(player1?.lastPlayed).toEqual(new Date('2024-06-15'));
    });

    it('should calculate correct win rate per opponent', async () => {
      const games = createVariedOpponentGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpponentStats(1);

      const player1 = stats.find((s) => s.username === 'player1');
      // 2 wins, 1 loss = 66.67%
      expect(player1?.winRate).toBeCloseTo(66.67, 1);
    });

    it('should filter by minGames', async () => {
      const games = createVariedOpponentGames();
      vi.mocked(mockGameRepo.findAll).mockResolvedValue(games);

      const stats = await service.getOpponentStats(1, 2);

      stats.forEach((s) => {
        expect(s.games).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('updateGameAnalysis()', () => {
    it('should call repository to update analysis', async () => {
      const analysis = {
        accuracy: 85,
        blunders: 2,
        mistakes: 3,
        inaccuracies: 5,
        acpl: 32,
      };
      vi.mocked(mockGameRepo.updateAnalysis).mockResolvedValue();

      await service.updateGameAnalysis('game123', analysis);

      expect(mockGameRepo.updateAnalysis).toHaveBeenCalledWith('game123', analysis);
    });
  });
});
