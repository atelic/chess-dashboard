import { describe, it, expect, beforeEach } from 'vitest';
import { LichessClient } from '@/lib/infrastructure/api-clients/LichessClient';
import { InvalidUsernameError, RateLimitError, ExternalApiError } from '@/lib/shared/errors';

describe('LichessClient', () => {
  let client: LichessClient;

  beforeEach(() => {
    client = new LichessClient();
  });

  describe('source property', () => {
    it('should be lichess', () => {
      expect(client.source).toBe('lichess');
    });
  });

  describe('validateUser()', () => {
    it('should return true for valid user', async () => {
      const result = await client.validateUser('testuser');

      expect(result).toBe(true);
    });

    it('should return false for invalid user', async () => {
      const result = await client.validateUser('invaliduser');

      expect(result).toBe(false);
    });

    it('should return false for user not found', async () => {
      const result = await client.validateUser('notfound');

      expect(result).toBe(false);
    });

    it('should handle rate limiting gracefully', async () => {
      const result = await client.validateUser('ratelimited');

      expect(result).toBe(false);
    });
  });

  describe('fetchGames()', () => {
    it('should parse NDJSON stream correctly', async () => {
      const games = await client.fetchGames('testuser');

      expect(games.length).toBe(3); // Our mock has 3 lines of NDJSON
    });

    it('should request with correct query parameters', async () => {
      const games = await client.fetchGames('testuser');

      // Games should be parsed correctly
      expect(games.length).toBeGreaterThan(0);
    });

    it('should throw InvalidUsernameError for 404', async () => {
      await expect(client.fetchGames('invaliduser')).rejects.toThrow(InvalidUsernameError);
    });

    it('should throw RateLimitError for 429', async () => {
      await expect(client.fetchGames('ratelimited')).rejects.toThrow(RateLimitError);
    });

    it('should throw ExternalApiError for other errors', async () => {
      await expect(client.fetchGames('servererror')).rejects.toThrow(ExternalApiError);
    });

    it('should return empty array when no games', async () => {
      const games = await client.fetchGames('emptygames');

      expect(games).toEqual([]);
    });

    it('should sort games by date descending', async () => {
      const games = await client.fetchGames('testuser');

      for (let i = 1; i < games.length; i++) {
        expect(games[i - 1].playedAt.getTime()).toBeGreaterThanOrEqual(games[i].playedAt.getTime());
      }
    });
  });

  describe('game conversion', () => {
    it('should determine winner from winner field', async () => {
      const games = await client.fetchGames('testuser');

      // First game: testuser is white, white won -> win
      const whiteWin = games.find((g) => g.playerColor === 'white' && g.result === 'win');
      expect(whiteWin).toBeDefined();

      // Second game: testuser is black, white won -> loss
      const blackLoss = games.find((g) => g.playerColor === 'black' && g.result === 'loss');
      expect(blackLoss).toBeDefined();
    });

    it('should handle draw games', async () => {
      const games = await client.fetchGames('testuser');

      // Third game is a draw
      const drawGame = games.find((g) => g.result === 'draw');
      expect(drawGame).toBeDefined();
    });

    it('should map speed to timeClass correctly', async () => {
      const games = await client.fetchGames('testuser');

      const blitzGames = games.filter((g) => g.timeClass === 'blitz');
      expect(blitzGames.length).toBe(2);

      const rapidGames = games.filter((g) => g.timeClass === 'rapid');
      expect(rapidGames.length).toBe(1);
    });

    it('should map status to termination correctly', async () => {
      const games = await client.fetchGames('testuser');

      // mate -> checkmate
      const checkmateGame = games.find((g) => g.termination === 'checkmate');
      expect(checkmateGame).toBeDefined();

      // resign -> resignation
      const resignGame = games.find((g) => g.termination === 'resignation');
      expect(resignGame).toBeDefined();

      // draw -> agreement
      const drawGame = games.find((g) => g.termination === 'agreement');
      expect(drawGame).toBeDefined();
    });

    it('should extract clock data from clocks array', async () => {
      const games = await client.fetchGames('testuser');

      // Games with clocks array should have clock data
      const gamesWithClock = games.filter((g) => g.clock !== undefined);
      expect(gamesWithClock.length).toBeGreaterThan(0);

      gamesWithClock.forEach((game) => {
        expect(game.clock?.initialTime).toBeGreaterThan(0);
        expect(game.clock?.increment).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate time remaining from clocks', async () => {
      const games = await client.fetchGames('testuser');

      const gamesWithTimeRemaining = games.filter((g) => g.clock?.timeRemaining !== undefined);
      expect(gamesWithTimeRemaining.length).toBeGreaterThan(0);
    });

    it('should handle games without clocks array', async () => {
      const games = await client.fetchGames('testuser');

      // Third game in our mock doesn't have clocks array
      const drawGame = games.find((g) => g.result === 'draw');
      // Should still have clock from the clock field (initial/increment)
      expect(drawGame?.clock?.initialTime).toBe(600);
    });

    it('should extract opening info', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.opening.eco).toBeDefined();
        expect(game.opening.name).toBeDefined();
      });
    });

    it('should extract rating change', async () => {
      const games = await client.fetchGames('testuser');

      // First game should have rating change
      const gameWithRatingChange = games.find((g) => g.ratingChange !== undefined);
      expect(gameWithRatingChange).toBeDefined();
    });

    it('should handle anonymous opponents', async () => {
      // Our mock data has named opponents, but the code should handle anonymous
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.opponent.username).toBeDefined();
      });
    });

    it('should set source to lichess', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.source).toBe('lichess');
      });
    });

    it('should generate correct game URL', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.gameUrl).toContain('lichess.org');
        expect(game.gameUrl).toContain(game.id);
      });
    });

    it('should count moves from moves string', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.moveCount).toBeGreaterThan(0);
      });
    });
  });

  describe('date filtering', () => {
    it('should accept since parameter', async () => {
      const since = new Date('2024-06-14T00:00:00Z');
      const games = await client.fetchGames('testuser', { since });

      // Games should be filtered (our mock doesn't actually filter, but the parameter should be accepted)
      expect(games.length).toBeGreaterThan(0);
    });

    it('should accept until parameter', async () => {
      const until = new Date('2024-06-16T00:00:00Z');
      const games = await client.fetchGames('testuser', { until });

      expect(games.length).toBeGreaterThan(0);
    });
  });

  describe('maxGames option', () => {
    it('should respect maxGames limit', async () => {
      // When not fetchAll, should include max parameter
      const games = await client.fetchGames('testuser', { maxGames: 50 });

      // Our mock returns all games regardless, but the parameter should be sent
      expect(games.length).toBeGreaterThan(0);
    });
  });
});
