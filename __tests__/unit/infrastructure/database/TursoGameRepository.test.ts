import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TursoGameRepository } from '@/lib/infrastructure/database/repositories/TursoGameRepository';
import { GameFilter } from '@/lib/domain/models/GameFilter';
import {
  TestDatabaseClient,
  createTestDatabase,
  insertTestUser,
  clearTestData,
} from '@/__tests__/fixtures/test-db';
import {
  createTestGame,
  createLichessGame,
  createGameWithAnalysis,
  createGameWithClock,
} from '@/__tests__/fixtures/game';

describe('TursoGameRepository', () => {
  let db: TestDatabaseClient;
  let repository: TursoGameRepository;
  let userId: number;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new TursoGameRepository(db as never);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(async () => {
    await clearTestData(db);
    userId = await insertTestUser(db);
  });

  describe('save()', () => {
    it('should insert a new game', async () => {
      const game = createTestGame({ id: 'game-1' });

      await repository.save({ ...game, userId });

      const found = await repository.findById('game-1');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('game-1');
    });

    it('should update existing game on conflict (upsert)', async () => {
      const game = createTestGame({ id: 'game-1', result: 'win' });
      await repository.save({ ...game, userId });

      // Save again with different result
      const updatedGame = createTestGame({ id: 'game-1', result: 'loss' });
      await repository.save({ ...updatedGame, userId });

      const found = await repository.findById('game-1');
      expect(found?.result).toBe('loss');
    });

    it('should preserve all game fields', async () => {
      const game = createTestGame({
        id: 'full-game',
        source: 'lichess',
        timeClass: 'rapid',
        playerColor: 'black',
        result: 'draw',
        opening: { eco: 'C50', name: 'Italian Game' },
        opponent: { username: 'Magnus', rating: 2800 },
        playerRating: 1500,
        termination: 'stalemate',
        moveCount: 50,
        ratingChange: 5,
        rated: false,
        gameUrl: 'https://lichess.org/abc123',
      });

      await repository.save({ ...game, userId });

      const found = await repository.findById('full-game');
      expect(found?.source).toBe('lichess');
      expect(found?.timeClass).toBe('rapid');
      expect(found?.playerColor).toBe('black');
      expect(found?.result).toBe('draw');
      expect(found?.opening.eco).toBe('C50');
      expect(found?.opening.name).toBe('Italian Game');
      expect(found?.opponent.username).toBe('Magnus');
      expect(found?.opponent.rating).toBe(2800);
      expect(found?.playerRating).toBe(1500);
      expect(found?.termination).toBe('stalemate');
      expect(found?.moveCount).toBe(50);
      expect(found?.ratingChange).toBe(5);
      expect(found?.rated).toBe(false);
      expect(found?.gameUrl).toBe('https://lichess.org/abc123');
    });

    it('should save clock data', async () => {
      const game = createGameWithClock({ id: 'clock-game' });

      await repository.save({ ...game, userId });

      const found = await repository.findById('clock-game');
      expect(found?.clock).toBeDefined();
      expect(found?.clock?.initialTime).toBe(180);
      expect(found?.clock?.increment).toBe(0);
      expect(found?.clock?.timeRemaining).toBe(45);
      expect(found?.clock?.avgMoveTime).toBe(5.5);
    });

    it('should save analysis data', async () => {
      const game = createGameWithAnalysis({ id: 'analysis-game' });

      await repository.save({ ...game, userId });

      const found = await repository.findById('analysis-game');
      expect(found?.analysis).toBeDefined();
      expect(found?.analysis?.accuracy).toBe(85.5);
      expect(found?.analysis?.blunders).toBe(2);
      expect(found?.analysis?.mistakes).toBe(3);
      expect(found?.analysis?.inaccuracies).toBe(5);
      expect(found?.analysis?.acpl).toBe(32);
    });
  });

  describe('saveMany()', () => {
    it('should save multiple games in batch', async () => {
      const games = [
        { ...createTestGame({ id: 'batch-1' }), userId },
        { ...createTestGame({ id: 'batch-2' }), userId },
        { ...createTestGame({ id: 'batch-3' }), userId },
      ];

      const count = await repository.saveMany(games);

      expect(count).toBe(3);
      const all = await repository.findAll(userId);
      expect(all.length).toBe(3);
    });

    it('should handle empty array', async () => {
      const count = await repository.saveMany([]);

      expect(count).toBe(0);
    });

    it('should handle conflicts with upsert by preserving analysis data', async () => {
      // First save without analysis
      const game = createTestGame({ id: 'upsert-game' });
      await repository.save({ ...game, userId });

      // Save again with analysis data - the upsert should add analysis
      const withAnalysis = createGameWithAnalysis({ id: 'upsert-game' });
      await repository.saveMany([{ ...withAnalysis, userId }]);

      const found = await repository.findById('upsert-game');
      // Analysis should be added
      expect(found?.analysis?.accuracy).toBe(85.5);
    });
  });

  describe('findAll()', () => {
    beforeEach(async () => {
      // Insert test games
      const games = [
        { ...createTestGame({ id: '1', timeClass: 'blitz', result: 'win', source: 'chesscom' }), userId },
        { ...createTestGame({ id: '2', timeClass: 'rapid', result: 'loss', source: 'lichess' }), userId },
        { ...createTestGame({ id: '3', timeClass: 'blitz', result: 'draw', source: 'chesscom' }), userId },
        { ...createTestGame({ id: '4', timeClass: 'bullet', result: 'win', source: 'lichess' }), userId },
      ];
      await repository.saveMany(games);
    });

    it('should return all games for user', async () => {
      const games = await repository.findAll(userId);

      expect(games.length).toBe(4);
    });

    it('should filter by time class', async () => {
      const filter = GameFilter.empty().withTimeClasses(['blitz']);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(2);
      games.forEach((g) => expect(g.timeClass).toBe('blitz'));
    });

    it('should filter by result', async () => {
      const filter = GameFilter.empty().withResults(['win']);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(2);
      games.forEach((g) => expect(g.result).toBe('win'));
    });

    it('should filter by source', async () => {
      const filter = GameFilter.empty().withSources(['lichess']);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(2);
      games.forEach((g) => expect(g.source).toBe('lichess'));
    });

    it('should filter by color', async () => {
      // Add a black game
      await repository.save({ 
        ...createTestGame({ id: '5', playerColor: 'black' }), 
        userId 
      });

      const filter = GameFilter.empty().withColors(['black']);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(1);
      expect(games[0].playerColor).toBe('black');
    });

    it('should filter by rated status', async () => {
      await repository.save({
        ...createTestGame({ id: 'unrated', rated: false }),
        userId,
      });

      const filter = GameFilter.empty().withRated(false);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(1);
      expect(games[0].rated).toBe(false);
    });

    it('should filter by date range', async () => {
      const oldGame = {
        ...createTestGame({ 
          id: 'old', 
          playedAt: new Date('2024-01-01T10:00:00Z') 
        }),
        userId,
      };
      await repository.save(oldGame);

      const filter = GameFilter.empty().withDateRange({
        start: new Date('2024-06-01'),
        end: new Date('2024-06-30'),
      });
      const games = await repository.findAll(userId, filter);

      // Should exclude the old game
      expect(games.every((g) => g.id !== 'old')).toBe(true);
    });

    it('should filter by opening ECO', async () => {
      // Clear existing games and add specific ones
      await db.execute('DELETE FROM games WHERE user_id = ?', [userId]);
      
      await repository.save({
        ...createTestGame({ id: 'sicilian', opening: { eco: 'B20', name: 'Sicilian' } }),
        userId,
      });
      await repository.save({
        ...createTestGame({ id: 'italian', opening: { eco: 'C50', name: 'Italian' } }),
        userId,
      });

      const filter = GameFilter.empty().withOpenings(['B20']);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(1);
      expect(games[0].opening.eco).toBe('B20');
    });

    it('should filter by opponent (case insensitive)', async () => {
      // Clear existing games first
      await db.execute('DELETE FROM games WHERE user_id = ?', [userId]);
      
      await repository.save({
        ...createTestGame({ id: 'vs-magnus', opponent: { username: 'Magnus', rating: 2800 } }),
        userId,
      });

      const filter = GameFilter.empty().withOpponents(['magnus']); // lowercase
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(1);
    });

    it('should combine multiple filters (AND logic)', async () => {
      const filter = GameFilter.empty()
        .withTimeClasses(['blitz'])
        .withResults(['win']);
      const games = await repository.findAll(userId, filter);

      expect(games.length).toBe(1);
      expect(games[0].timeClass).toBe('blitz');
      expect(games[0].result).toBe('win');
    });

    it('should return empty array when no matches', async () => {
      const filter = GameFilter.empty().withTimeClasses(['classical']);
      const games = await repository.findAll(userId, filter);

      expect(games).toEqual([]);
    });

    it('should not return games from other users', async () => {
      const otherUserId = await insertTestUser(db, {
        chesscomUsername: 'other',
        lichessUsername: 'other',
      });
      await repository.save({
        ...createTestGame({ id: 'other-user-game' }),
        userId: otherUserId,
      });

      const games = await repository.findAll(userId);

      expect(games.every((g) => g.id !== 'other-user-game')).toBe(true);
    });
  });

  describe('findById()', () => {
    it('should return game when found', async () => {
      await repository.save({ ...createTestGame({ id: 'find-me' }), userId });

      const found = await repository.findById('find-me');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('find-me');
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('findByIds()', () => {
    it('should return multiple games', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: 'a' }), userId },
        { ...createTestGame({ id: 'b' }), userId },
        { ...createTestGame({ id: 'c' }), userId },
      ]);

      const games = await repository.findByIds(['a', 'c']);

      expect(games.length).toBe(2);
      expect(games.map((g) => g.id).sort()).toEqual(['a', 'c']);
    });

    it('should return empty array for empty input', async () => {
      const games = await repository.findByIds([]);

      expect(games).toEqual([]);
    });
  });

  describe('findByEco()', () => {
    beforeEach(async () => {
      await repository.saveMany([
        { ...createTestGame({ id: 's1', opening: { eco: 'B20', name: 'Sicilian' }, playerColor: 'white' }), userId },
        { ...createTestGame({ id: 's2', opening: { eco: 'B20', name: 'Sicilian' }, playerColor: 'black' }), userId },
        { ...createTestGame({ id: 'i1', opening: { eco: 'C50', name: 'Italian' }, playerColor: 'white' }), userId },
      ]);
    });

    it('should find games by ECO code', async () => {
      const games = await repository.findByEco(userId, 'B20');

      expect(games.length).toBe(2);
    });

    it('should filter by color when specified', async () => {
      const games = await repository.findByEco(userId, 'B20', 'white');

      expect(games.length).toBe(1);
      expect(games[0].playerColor).toBe('white');
    });
  });

  describe('findByOpponent()', () => {
    beforeEach(async () => {
      await repository.saveMany([
        { ...createTestGame({ id: 'm1', opponent: { username: 'Magnus', rating: 2800 } }), userId },
        { ...createTestGame({ id: 'm2', opponent: { username: 'MAGNUS', rating: 2850 } }), userId },
        { ...createTestGame({ id: 'h1', opponent: { username: 'Hikaru', rating: 2750 } }), userId },
      ]);
    });

    it('should find games by opponent (case insensitive)', async () => {
      const games = await repository.findByOpponent(userId, 'magnus');

      expect(games.length).toBe(2);
    });

    it('should return empty when no matches', async () => {
      const games = await repository.findByOpponent(userId, 'unknown');

      expect(games).toEqual([]);
    });
  });

  describe('count()', () => {
    it('should return total game count', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: '1' }), userId },
        { ...createTestGame({ id: '2' }), userId },
        { ...createTestGame({ id: '3' }), userId },
      ]);

      const count = await repository.count(userId);

      expect(count).toBe(3);
    });

    it('should respect filters', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: '1', result: 'win' }), userId },
        { ...createTestGame({ id: '2', result: 'win' }), userId },
        { ...createTestGame({ id: '3', result: 'loss' }), userId },
      ]);

      const filter = GameFilter.empty().withResults(['win']);
      const count = await repository.count(userId, filter);

      expect(count).toBe(2);
    });

    it('should return 0 when no games', async () => {
      const count = await repository.count(userId);

      expect(count).toBe(0);
    });
  });

  describe('existsById()', () => {
    it('should return true when game exists', async () => {
      await repository.save({ ...createTestGame({ id: 'exists' }), userId });

      const exists = await repository.existsById('exists');

      expect(exists).toBe(true);
    });

    it('should return false when game does not exist', async () => {
      const exists = await repository.existsById('nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('deleteByUser()', () => {
    it('should delete all games for user', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: '1' }), userId },
        { ...createTestGame({ id: '2' }), userId },
      ]);

      const deleted = await repository.deleteByUser(userId);

      expect(deleted).toBe(2);
      const remaining = await repository.findAll(userId);
      expect(remaining).toEqual([]);
    });

    it('should not affect other users games', async () => {
      const otherUserId = await insertTestUser(db, {
        chesscomUsername: 'other',
        lichessUsername: null,
      });
      await repository.save({ ...createTestGame({ id: 'keep' }), userId: otherUserId });
      await repository.save({ ...createTestGame({ id: 'delete' }), userId });

      await repository.deleteByUser(userId);

      const otherGames = await repository.findAll(otherUserId);
      expect(otherGames.length).toBe(1);
    });

    it('should return 0 when no games to delete', async () => {
      const deleted = await repository.deleteByUser(userId);

      expect(deleted).toBe(0);
    });
  });

  describe('updateAnalysis()', () => {
    it('should update analysis fields', async () => {
      await repository.save({ ...createTestGame({ id: 'analyze-me' }), userId });

      await repository.updateAnalysis('analyze-me', {
        accuracy: 90,
        blunders: 1,
        mistakes: 2,
        inaccuracies: 3,
        acpl: 25,
      });

      const found = await repository.findById('analyze-me');
      expect(found?.analysis?.accuracy).toBe(90);
      expect(found?.analysis?.blunders).toBe(1);
      expect(found?.analysis?.mistakes).toBe(2);
      expect(found?.analysis?.inaccuracies).toBe(3);
      expect(found?.analysis?.acpl).toBe(25);
    });

    it('should set analyzed_at timestamp', async () => {
      await repository.save({ ...createTestGame({ id: 'timestamp-test' }), userId });

      await repository.updateAnalysis('timestamp-test', {
        blunders: 0,
        mistakes: 0,
        inaccuracies: 0,
      });

      const found = await repository.findById('timestamp-test');
      expect(found?.analysis?.analyzedAt).toBeDefined();
    });
  });

  describe('getLatestGameDate()', () => {
    it('should return most recent game date', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: '1', playedAt: new Date('2024-01-01') }), userId },
        { ...createTestGame({ id: '2', playedAt: new Date('2024-06-15') }), userId },
        { ...createTestGame({ id: '3', playedAt: new Date('2024-03-01') }), userId },
      ]);

      const latest = await repository.getLatestGameDate(userId, 'chesscom');

      expect(latest?.toISOString()).toContain('2024-06-15');
    });

    it('should filter by source', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: '1', source: 'chesscom', playedAt: new Date('2024-06-01') }), userId },
        { ...createLichessGame({ id: '2', playedAt: new Date('2024-06-15') }), userId },
      ]);

      const latest = await repository.getLatestGameDate(userId, 'chesscom');

      expect(latest?.toISOString()).toContain('2024-06-01');
    });

    it('should return null when no games', async () => {
      const latest = await repository.getLatestGameDate(userId, 'chesscom');

      expect(latest).toBeNull();
    });
  });

  describe('findGamesNeedingAnalysis()', () => {
    it('should find games without analysis', async () => {
      await repository.save({ ...createTestGame({ id: 'no-analysis' }), userId });
      await repository.save({ ...createGameWithAnalysis({ id: 'has-analysis' }), userId });

      const games = await repository.findGamesNeedingAnalysis(userId);

      expect(games.length).toBe(1);
      expect(games[0].id).toBe('no-analysis');
    });

    it('should respect limit', async () => {
      await repository.saveMany([
        { ...createTestGame({ id: '1' }), userId },
        { ...createTestGame({ id: '2' }), userId },
        { ...createTestGame({ id: '3' }), userId },
      ]);

      const games = await repository.findGamesNeedingAnalysis(userId, 2);

      expect(games.length).toBe(2);
    });
  });
});
