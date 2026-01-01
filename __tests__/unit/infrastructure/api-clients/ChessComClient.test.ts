import { describe, it, expect, beforeEach } from 'vitest';
import { ChessComClient } from '@/lib/infrastructure/api-clients/ChessComClient';
import { InvalidUsernameError, RateLimitError, ExternalApiError } from '@/lib/shared/errors';

describe('ChessComClient', () => {
  let client: ChessComClient;

  beforeEach(() => {
    client = new ChessComClient();
  });

  describe('source property', () => {
    it('should be chesscom', () => {
      expect(client.source).toBe('chesscom');
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
      // Rate limited users just return false for validation
      const result = await client.validateUser('ratelimited');

      expect(result).toBe(false);
    });
  });

  describe('fetchGames()', () => {
    it('should fetch games from most recent archive first', async () => {
      const games = await client.fetchGames('testuser');

      expect(games.length).toBeGreaterThan(0);
      // Games should be sorted by date descending
      for (let i = 1; i < games.length; i++) {
        expect(games[i - 1].playedAt.getTime()).toBeGreaterThanOrEqual(games[i].playedAt.getTime());
      }
    });

    it('should respect maxGames limit', async () => {
      const games = await client.fetchGames('testuser', { maxGames: 1 });

      // Default mock returns 2 games, but we limited to 1
      expect(games.length).toBeLessThanOrEqual(1);
    });

    it('should fetch all games when fetchAll is true', async () => {
      const games = await client.fetchGames('testuser', { fetchAll: true });

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

    it('should return empty array when no archives exist', async () => {
      const games = await client.fetchGames('emptygames');

      expect(games).toEqual([]);
    });
  });

  describe('game conversion', () => {
    it('should correctly identify player color as white', async () => {
      const games = await client.fetchGames('testuser');
      const whiteGame = games.find((g) => g.opponent.username === 'opponent123');

      expect(whiteGame).toBeDefined();
      expect(whiteGame?.playerColor).toBe('white');
    });

    it('should correctly identify player color as black', async () => {
      const games = await client.fetchGames('testuser');
      const blackGame = games.find((g) => g.opponent.username === 'opponent456');

      expect(blackGame).toBeDefined();
      expect(blackGame?.playerColor).toBe('black');
    });

    it('should map win result correctly', async () => {
      const games = await client.fetchGames('testuser');
      const winGame = games.find((g) => g.playerColor === 'white');

      expect(winGame?.result).toBe('win');
    });

    it('should map loss result correctly', async () => {
      const games = await client.fetchGames('testuser');
      const lossGame = games.find((g) => g.playerColor === 'black');

      expect(lossGame?.result).toBe('loss');
    });

    it('should parse opening ECO from PGN', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.opening.eco).toBeDefined();
        expect(game.opening.eco.length).toBeGreaterThan(0);
      });
    });

    it('should parse opening name from PGN', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.opening.name).toBeDefined();
        expect(game.opening.name.length).toBeGreaterThan(0);
      });
    });

    it('should map time class correctly', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(['bullet', 'blitz', 'rapid', 'classical']).toContain(game.timeClass);
      });
    });

    it('should determine termination type', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect([
          'checkmate',
          'resignation',
          'timeout',
          'stalemate',
          'insufficient',
          'repetition',
          'agreement',
          'abandoned',
          'other',
        ]).toContain(game.termination);
      });
    });

    it('should count moves from PGN', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.moveCount).toBeGreaterThan(0);
      });
    });

    it('should set rated property', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(typeof game.rated).toBe('boolean');
      });
    });

    it('should set game URL', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.gameUrl).toContain('chess.com');
      });
    });

    it('should set source to chesscom', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.source).toBe('chesscom');
      });
    });

    it('should extract player rating', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.playerRating).toBeGreaterThan(0);
      });
    });

    it('should extract opponent rating', async () => {
      const games = await client.fetchGames('testuser');

      games.forEach((game) => {
        expect(game.opponent.rating).toBeGreaterThan(0);
      });
    });

    it('should extract clock data when available', async () => {
      const games = await client.fetchGames('testuser');
      
      // At least some games should have clock data
      const gamesWithClock = games.filter((g) => g.clock !== undefined);
      expect(gamesWithClock.length).toBeGreaterThan(0);

      gamesWithClock.forEach((game) => {
        expect(game.clock?.initialTime).toBeGreaterThan(0);
        expect(game.clock?.increment).toBeGreaterThanOrEqual(0);
      });
    });

    it('should extract accuracy when available', async () => {
      const games = await client.fetchGames('testuser');
      
      // At least one game should have accuracy (the first one in our mock has it)
      const gamesWithAnalysis = games.filter((g) => g.analysis !== undefined);
      expect(gamesWithAnalysis.length).toBeGreaterThan(0);

      gamesWithAnalysis.forEach((game) => {
        expect(game.analysis?.accuracy).toBeGreaterThan(0);
      });
    });
  });

  describe('date filtering', () => {
    it('should filter by since date', async () => {
      const since = new Date('2024-06-15T00:00:00Z');
      const games = await client.fetchGames('testuser', { since });

      games.forEach((game) => {
        expect(game.playedAt.getTime()).toBeGreaterThanOrEqual(since.getTime());
      });
    });

    it('should filter by until date', async () => {
      const until = new Date('2024-06-16T00:00:00Z');
      const games = await client.fetchGames('testuser', { until });

      games.forEach((game) => {
        expect(game.playedAt.getTime()).toBeLessThanOrEqual(until.getTime());
      });
    });
  });
});
