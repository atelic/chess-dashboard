import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getWinRate,
  getDrawRate,
  formatGameCount,
  clearExplorerCache,
  type ExplorerResponse,
} from '@/lib/analysis/lichess-opening-explorer';

describe('Lichess Opening Explorer', () => {
  beforeEach(() => {
    clearExplorerCache();
  });

  afterEach(() => {
    clearExplorerCache();
  });

  const mockExplorerResponse: ExplorerResponse = {
    white: 500000,
    draws: 300000,
    black: 400000,
    moves: [
      { uci: 'e2e4', san: 'e4', white: 200000, draws: 120000, black: 160000, averageRating: 1800 },
      { uci: 'd2d4', san: 'd4', white: 180000, draws: 100000, black: 140000, averageRating: 1850 },
      { uci: 'c2c4', san: 'c4', white: 80000, draws: 50000, black: 70000, averageRating: 1900 },
    ],
    opening: { eco: 'A00', name: 'Start Position' },
  };

  // ============================================
  // WIN RATE CALCULATIONS
  // ============================================

  describe('getWinRate', () => {
    it('calculates win rate for white', () => {
      const data: ExplorerResponse = {
        white: 600,
        draws: 200,
        black: 200,
        moves: [],
      };

      const winRate = getWinRate(data, 'white');

      expect(winRate).toBe(60); // 600/1000 * 100
    });

    it('calculates win rate for black', () => {
      const data: ExplorerResponse = {
        white: 200,
        draws: 200,
        black: 600,
        moves: [],
      };

      const winRate = getWinRate(data, 'black');

      expect(winRate).toBe(60); // 600/1000 * 100
    });

    it('returns 50 for empty data', () => {
      const data: ExplorerResponse = {
        white: 0,
        draws: 0,
        black: 0,
        moves: [],
      };

      const winRate = getWinRate(data, 'white');

      expect(winRate).toBe(50);
    });

    it('handles unequal distributions', () => {
      const data: ExplorerResponse = {
        white: 700,
        draws: 100,
        black: 200,
        moves: [],
      };

      expect(getWinRate(data, 'white')).toBe(70);
      expect(getWinRate(data, 'black')).toBe(20);
    });
  });

  // ============================================
  // DRAW RATE CALCULATIONS
  // ============================================

  describe('getDrawRate', () => {
    it('calculates draw rate correctly', () => {
      const data: ExplorerResponse = {
        white: 400,
        draws: 200,
        black: 400,
        moves: [],
      };

      const drawRate = getDrawRate(data);

      expect(drawRate).toBe(20); // 200/1000 * 100
    });

    it('returns 0 for empty data', () => {
      const data: ExplorerResponse = {
        white: 0,
        draws: 0,
        black: 0,
        moves: [],
      };

      const drawRate = getDrawRate(data);

      expect(drawRate).toBe(0);
    });

    it('calculates high draw rate correctly', () => {
      const data: ExplorerResponse = {
        white: 100,
        draws: 800,
        black: 100,
        moves: [],
      };

      const drawRate = getDrawRate(data);

      expect(drawRate).toBe(80);
    });

    it('handles zero draws', () => {
      const data: ExplorerResponse = {
        white: 500,
        draws: 0,
        black: 500,
        moves: [],
      };

      const drawRate = getDrawRate(data);

      expect(drawRate).toBe(0);
    });
  });

  // ============================================
  // GAME COUNT FORMATTING
  // ============================================

  describe('formatGameCount', () => {
    it('formats millions correctly', () => {
      expect(formatGameCount(1500000)).toBe('1.5M');
      expect(formatGameCount(2000000)).toBe('2.0M');
      expect(formatGameCount(10500000)).toBe('10.5M');
    });

    it('formats thousands correctly', () => {
      expect(formatGameCount(1500)).toBe('1.5K');
      expect(formatGameCount(10000)).toBe('10.0K');
      expect(formatGameCount(999000)).toBe('999.0K');
    });

    it('formats small numbers as-is', () => {
      expect(formatGameCount(500)).toBe('500');
      expect(formatGameCount(99)).toBe('99');
      expect(formatGameCount(0)).toBe('0');
      expect(formatGameCount(999)).toBe('999');
    });

    it('handles boundary values', () => {
      expect(formatGameCount(1000)).toBe('1.0K');
      expect(formatGameCount(1000000)).toBe('1.0M');
    });
  });

  // ============================================
  // EXPLORER RESPONSE TYPE TESTS
  // ============================================

  describe('ExplorerResponse type', () => {
    it('has correct structure', () => {
      expect(mockExplorerResponse.white).toBe(500000);
      expect(mockExplorerResponse.draws).toBe(300000);
      expect(mockExplorerResponse.black).toBe(400000);
      expect(mockExplorerResponse.moves).toHaveLength(3);
      expect(mockExplorerResponse.opening?.eco).toBe('A00');
    });

    it('moves have correct properties', () => {
      const move = mockExplorerResponse.moves[0];
      expect(move.uci).toBe('e2e4');
      expect(move.san).toBe('e4');
      expect(move.white).toBe(200000);
      expect(move.draws).toBe(120000);
      expect(move.black).toBe(160000);
      expect(move.averageRating).toBe(1800);
    });
  });

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  describe('clearExplorerCache', () => {
    it('can be called without error', () => {
      expect(() => clearExplorerCache()).not.toThrow();
    });

    it('can be called multiple times', () => {
      clearExplorerCache();
      clearExplorerCache();
      clearExplorerCache();
      // No error thrown
      expect(true).toBe(true);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('edge cases', () => {
    it('handles response with empty moves array', () => {
      const data: ExplorerResponse = {
        white: 100,
        draws: 100,
        black: 100,
        moves: [],
      };

      expect(getWinRate(data, 'white')).toBeCloseTo(33.33, 1);
      expect(getDrawRate(data)).toBeCloseTo(33.33, 1);
    });

    it('handles very large numbers', () => {
      const data: ExplorerResponse = {
        white: 100000000,
        draws: 50000000,
        black: 50000000,
        moves: [],
      };

      expect(getWinRate(data, 'white')).toBe(50);
      expect(getDrawRate(data)).toBe(25);
    });

    it('formats very large game counts', () => {
      expect(formatGameCount(999999999)).toBe('1000.0M');
    });
  });
});
