import { describe, it, expect } from 'vitest';
import { GameFilter } from '@/lib/domain/models/GameFilter';
import type { Game } from '@/lib/domain/models/Game';

// Helper to create a test game
function createTestGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-game-1',
    source: 'chesscom',
    playedAt: new Date('2024-06-15'),
    timeClass: 'blitz',
    playerColor: 'white',
    result: 'win',
    opening: { eco: 'B20', name: 'Sicilian Defense' },
    opponent: { username: 'opponent123', rating: 1500 },
    playerRating: 1500,
    termination: 'checkmate',
    moveCount: 30,
    rated: true,
    gameUrl: 'https://chess.com/game/123',
    ...overrides,
  };
}

describe('GameFilter', () => {
  describe('empty()', () => {
    it('should create an empty filter', () => {
      const filter = GameFilter.empty();

      expect(filter.timeClasses).toEqual([]);
      expect(filter.colors).toEqual([]);
      expect(filter.results).toEqual([]);
      expect(filter.sources).toEqual([]);
      expect(filter.rated).toBeNull();
      expect(filter.dateRange).toBeNull();
      expect(filter.openings).toEqual([]);
      expect(filter.opponents).toEqual([]);
      expect(filter.opponentRatingRange).toBeNull();
      expect(filter.terminations).toEqual([]);
    });

    it('should match all games', () => {
      const filter = GameFilter.empty();
      const game = createTestGame();

      expect(filter.matches(game)).toBe(true);
    });

    it('should report as empty', () => {
      const filter = GameFilter.empty();

      expect(filter.isEmpty()).toBe(true);
      expect(filter.activeCount()).toBe(0);
    });
  });

  describe('builder methods', () => {
    it('should create immutable copies with withTimeClasses', () => {
      const original = GameFilter.empty();
      const modified = original.withTimeClasses(['blitz', 'rapid']);

      expect(original.timeClasses).toEqual([]);
      expect(modified.timeClasses).toEqual(['blitz', 'rapid']);
    });

    it('should chain builder methods', () => {
      const filter = GameFilter.empty()
        .withTimeClasses(['blitz'])
        .withColors(['white'])
        .withResults(['win'])
        .withRated(true);

      expect(filter.timeClasses).toEqual(['blitz']);
      expect(filter.colors).toEqual(['white']);
      expect(filter.results).toEqual(['win']);
      expect(filter.rated).toBe(true);
      expect(filter.activeCount()).toBe(4);
    });

    it('should handle all builder methods', () => {
      const dateRange = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };
      const ratingRange = { min: 1000, max: 2000 };

      const filter = GameFilter.empty()
        .withTimeClasses(['bullet', 'blitz'])
        .withColors(['white', 'black'])
        .withResults(['win', 'loss'])
        .withSources(['chesscom', 'lichess'])
        .withRated(true)
        .withDateRange(dateRange)
        .withOpenings(['B20', 'C50'])
        .withOpponents(['player1', 'player2'])
        .withOpponentRatingRange(ratingRange)
        .withTerminations(['checkmate', 'resignation']);

      expect(filter.timeClasses).toEqual(['bullet', 'blitz']);
      expect(filter.colors).toEqual(['white', 'black']);
      expect(filter.results).toEqual(['win', 'loss']);
      expect(filter.sources).toEqual(['chesscom', 'lichess']);
      expect(filter.rated).toBe(true);
      expect(filter.dateRange).toEqual(dateRange);
      expect(filter.openings).toEqual(['B20', 'C50']);
      expect(filter.opponents).toEqual(['player1', 'player2']);
      expect(filter.opponentRatingRange).toEqual(ratingRange);
      expect(filter.terminations).toEqual(['checkmate', 'resignation']);
    });
  });

  describe('matches()', () => {
    it('should filter by time class', () => {
      const filter = GameFilter.empty().withTimeClasses(['rapid']);
      const blitzGame = createTestGame({ timeClass: 'blitz' });
      const rapidGame = createTestGame({ timeClass: 'rapid' });

      expect(filter.matches(blitzGame)).toBe(false);
      expect(filter.matches(rapidGame)).toBe(true);
    });

    it('should filter by color', () => {
      const filter = GameFilter.empty().withColors(['black']);
      const whiteGame = createTestGame({ playerColor: 'white' });
      const blackGame = createTestGame({ playerColor: 'black' });

      expect(filter.matches(whiteGame)).toBe(false);
      expect(filter.matches(blackGame)).toBe(true);
    });

    it('should filter by result', () => {
      const filter = GameFilter.empty().withResults(['loss']);
      const winGame = createTestGame({ result: 'win' });
      const lossGame = createTestGame({ result: 'loss' });

      expect(filter.matches(winGame)).toBe(false);
      expect(filter.matches(lossGame)).toBe(true);
    });

    it('should filter by source', () => {
      const filter = GameFilter.empty().withSources(['lichess']);
      const chesscomGame = createTestGame({ source: 'chesscom' });
      const lichessGame = createTestGame({ source: 'lichess' });

      expect(filter.matches(chesscomGame)).toBe(false);
      expect(filter.matches(lichessGame)).toBe(true);
    });

    it('should filter by rated status', () => {
      const ratedFilter = GameFilter.empty().withRated(true);
      const unratedFilter = GameFilter.empty().withRated(false);
      const ratedGame = createTestGame({ rated: true });
      const unratedGame = createTestGame({ rated: false });

      expect(ratedFilter.matches(ratedGame)).toBe(true);
      expect(ratedFilter.matches(unratedGame)).toBe(false);
      expect(unratedFilter.matches(ratedGame)).toBe(false);
      expect(unratedFilter.matches(unratedGame)).toBe(true);
    });

    it('should filter by date range', () => {
      const filter = GameFilter.empty().withDateRange({
        start: new Date('2024-06-01'),
        end: new Date('2024-06-30'),
      });

      const beforeGame = createTestGame({ playedAt: new Date('2024-05-15') });
      const inRangeGame = createTestGame({ playedAt: new Date('2024-06-15') });
      const afterGame = createTestGame({ playedAt: new Date('2024-07-15') });

      expect(filter.matches(beforeGame)).toBe(false);
      expect(filter.matches(inRangeGame)).toBe(true);
      expect(filter.matches(afterGame)).toBe(false);
    });

    it('should filter by opening ECO code', () => {
      const filter = GameFilter.empty().withOpenings(['B20']);
      const sicilianGame = createTestGame({ opening: { eco: 'B20', name: 'Sicilian Defense' } });
      const italianGame = createTestGame({ opening: { eco: 'C50', name: 'Italian Game' } });

      expect(filter.matches(sicilianGame)).toBe(true);
      expect(filter.matches(italianGame)).toBe(false);
    });

    it('should filter by opponent (case insensitive)', () => {
      const filter = GameFilter.empty().withOpponents(['player123']);
      const matchingGame = createTestGame({ opponent: { username: 'Player123', rating: 1500 } });
      const nonMatchingGame = createTestGame({ opponent: { username: 'other', rating: 1500 } });

      expect(filter.matches(matchingGame)).toBe(true);
      expect(filter.matches(nonMatchingGame)).toBe(false);
    });

    it('should filter by opponent rating range', () => {
      const filter = GameFilter.empty().withOpponentRatingRange({ min: 1400, max: 1600 });

      const lowRatedGame = createTestGame({ opponent: { username: 'low', rating: 1200 } });
      const inRangeGame = createTestGame({ opponent: { username: 'mid', rating: 1500 } });
      const highRatedGame = createTestGame({ opponent: { username: 'high', rating: 1800 } });

      expect(filter.matches(lowRatedGame)).toBe(false);
      expect(filter.matches(inRangeGame)).toBe(true);
      expect(filter.matches(highRatedGame)).toBe(false);
    });

    it('should filter by termination type', () => {
      const filter = GameFilter.empty().withTerminations(['checkmate']);
      const checkmateGame = createTestGame({ termination: 'checkmate' });
      const resignGame = createTestGame({ termination: 'resignation' });

      expect(filter.matches(checkmateGame)).toBe(true);
      expect(filter.matches(resignGame)).toBe(false);
    });

    it('should combine multiple filters (AND logic)', () => {
      const filter = GameFilter.empty()
        .withTimeClasses(['blitz'])
        .withColors(['white'])
        .withResults(['win']);

      const matchingGame = createTestGame({
        timeClass: 'blitz',
        playerColor: 'white',
        result: 'win',
      });

      const partialMatch = createTestGame({
        timeClass: 'blitz',
        playerColor: 'white',
        result: 'loss', // Different result
      });

      expect(filter.matches(matchingGame)).toBe(true);
      expect(filter.matches(partialMatch)).toBe(false);
    });
  });

  describe('apply()', () => {
    it('should filter an array of games', () => {
      const filter = GameFilter.empty().withResults(['win']);
      const games = [
        createTestGame({ id: '1', result: 'win' }),
        createTestGame({ id: '2', result: 'loss' }),
        createTestGame({ id: '3', result: 'win' }),
        createTestGame({ id: '4', result: 'draw' }),
      ];

      const filtered = filter.apply(games);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((g) => g.id)).toEqual(['1', '3']);
    });
  });

  describe('serialization', () => {
    it('should serialize to query string', () => {
      const filter = GameFilter.empty()
        .withTimeClasses(['blitz', 'rapid'])
        .withRated(true);

      const queryString = filter.toQueryString();

      expect(queryString).toContain('timeClasses=blitz%2Crapid');
      expect(queryString).toContain('rated=true');
    });

    it('should serialize to JSON', () => {
      const filter = GameFilter.empty()
        .withTimeClasses(['blitz'])
        .withRated(true);

      const json = filter.toJSON();

      expect(json.timeClasses).toEqual(['blitz']);
      expect(json.rated).toBe(true);
    });

    it('should parse from query params', () => {
      const params = {
        timeClasses: 'blitz,rapid',
        rated: 'true',
        minRating: '1000',
        maxRating: '2000',
      };

      const filter = GameFilter.fromParams(params);

      expect(filter.timeClasses).toEqual(['blitz', 'rapid']);
      expect(filter.rated).toBe(true);
      expect(filter.opponentRatingRange).toEqual({ min: 1000, max: 2000 });
    });

    it('should create from object', () => {
      const data = {
        timeClasses: ['blitz'] as ('bullet' | 'blitz' | 'rapid' | 'classical')[],
        colors: ['white'] as ('white' | 'black')[],
        results: ['win'] as ('win' | 'loss' | 'draw')[],
        rated: true,
      };

      const filter = GameFilter.fromObject(data);

      expect(filter.timeClasses).toEqual(['blitz']);
      expect(filter.colors).toEqual(['white']);
      expect(filter.results).toEqual(['win']);
      expect(filter.rated).toBe(true);
    });
  });
});
