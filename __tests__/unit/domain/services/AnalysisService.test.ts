import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Evaluation } from '@/lib/analysis/lichess-cloud-eval';

const mockCloudEval: Evaluation = {
  score: 50,
  mate: null,
  bestMove: 'e2e4',
  depth: 36,
  pv: ['e2e4', 'e7e5'],
  source: 'cloud',
};

const mockLocalEval: Evaluation = {
  score: 30,
  mate: null,
  bestMove: 'd2d4',
  depth: 16,
  pv: ['d2d4', 'd7d5'],
  source: 'local',
};

const mockEngineAnalyze = vi.fn();
const mockEngineInit = vi.fn();
const mockEngineDestroy = vi.fn();

vi.mock('@/lib/analysis/lichess-cloud-eval', () => ({
  getCloudEval: vi.fn(),
  classifyMove: vi.fn((cpLoss: number) => {
    if (cpLoss >= 300) return 'blunder';
    if (cpLoss >= 100) return 'mistake';
    if (cpLoss >= 50) return 'inaccuracy';
    return 'good';
  }),
}));

vi.mock('@/lib/analysis/stockfish-engine', () => {
  return {
    StockfishEngine: vi.fn().mockImplementation(function() {
      return {
        init: mockEngineInit,
        destroy: mockEngineDestroy,
        analyze: mockEngineAnalyze,
      };
    }),
    calculateAccuracy: vi.fn((acpl: number) => Math.max(0, 100 - acpl / 2)),
    calculateAcpl: vi.fn((cpLosses: number[]) => {
      if (cpLosses.length === 0) return 0;
      return cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length;
    }),
    countClassifications: vi.fn((moves: Array<{ classification: string }>) => {
      let blunders = 0, mistakes = 0, inaccuracies = 0;
      for (const m of moves) {
        if (m.classification === 'blunder') blunders++;
        else if (m.classification === 'mistake') mistakes++;
        else if (m.classification === 'inaccuracy') inaccuracies++;
      }
      return { blunders, mistakes, inaccuracies };
    }),
  };
});

import { getCloudEval } from '@/lib/analysis/lichess-cloud-eval';
import { AnalysisService, getAnalysisService } from '@/lib/domain/services/AnalysisService';

const mockGetCloudEval = vi.mocked(getCloudEval);

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEngineAnalyze.mockResolvedValue(mockLocalEval);
    mockEngineInit.mockResolvedValue(undefined);
    service = new AnalysisService();
  });

  afterEach(() => {
    service.destroyEngine();
  });

  describe('analyzePosition', () => {
    it('uses cloud evaluation when available', async () => {
      mockGetCloudEval.mockResolvedValue(mockCloudEval);

      const result = await service.analyzePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

      expect(result).toEqual(mockCloudEval);
      expect(mockGetCloudEval).toHaveBeenCalledWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('falls back to local engine when cloud returns null', async () => {
      mockGetCloudEval.mockResolvedValue(null);

      const result = await service.analyzePosition('test-fen');

      expect(result).toEqual(mockLocalEval);
      expect(mockEngineInit).toHaveBeenCalled();
    });

    it('skips cloud when useCloud is false', async () => {
      const result = await service.analyzePosition('test-fen', { useCloud: false });

      expect(result).toEqual(mockLocalEval);
      expect(mockGetCloudEval).not.toHaveBeenCalled();
    });

    it('uses specified depth for local analysis', async () => {
      mockGetCloudEval.mockResolvedValue(null);

      await service.analyzePosition('test-fen', { depth: 20 });

      expect(mockEngineAnalyze).toHaveBeenCalledWith('test-fen', 20);
    });

    it('uses default depth of 16', async () => {
      mockGetCloudEval.mockResolvedValue(null);

      await service.analyzePosition('test-fen');

      expect(mockEngineAnalyze).toHaveBeenCalledWith('test-fen', 16);
    });
  });

  describe('initEngine', () => {
    it('initializes engine only once', async () => {
      mockGetCloudEval.mockResolvedValue(null);

      await service.analyzePosition('fen1');
      await service.analyzePosition('fen2');
      await service.analyzePosition('fen3');

      expect(mockEngineInit).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroyEngine', () => {
    it('destroys the engine and allows reinitialization', async () => {
      mockGetCloudEval.mockResolvedValue(null);

      await service.analyzePosition('fen1');
      service.destroyEngine();
      await service.analyzePosition('fen2');

      expect(mockEngineInit).toHaveBeenCalledTimes(2);
    });

    it('handles destroy when no engine exists', () => {
      expect(() => service.destroyEngine()).not.toThrow();
    });
  });

  describe('analyzeGame', () => {
    const testFens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    ];
    const testMoves = ['e2e4', 'e7e5', 'g1f3'];

    beforeEach(() => {
      mockGetCloudEval.mockResolvedValue(mockCloudEval);
    });

    it('returns complete game analysis', async () => {
      const result = await service.analyzeGame('game123', testFens, testMoves, 'white');

      expect(result.gameId).toBe('game123');
      expect(result.moves).toHaveLength(3);
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(typeof result.accuracy).toBe('number');
      expect(typeof result.blunders).toBe('number');
      expect(typeof result.mistakes).toBe('number');
      expect(typeof result.inaccuracies).toBe('number');
      expect(typeof result.acpl).toBe('number');
    });

    it('analyzes each position', async () => {
      await service.analyzeGame('game123', testFens, testMoves, 'white');

      expect(mockGetCloudEval.mock.calls.length).toBeGreaterThan(0);
    });

    it('calculates cpLoss for player moves only', async () => {
      const result = await service.analyzeGame('game123', testFens, testMoves, 'white');

      const playerMoves = result.moves.filter((_, i) => i % 2 === 0);
      const opponentMoves = result.moves.filter((_, i) => i % 2 === 1);

      expect(playerMoves.every(m => m.cpLoss >= 0)).toBe(true);
      expect(opponentMoves.every(m => m.cpLoss === 0)).toBe(true);
    });

    it('calls progress callback', async () => {
      const onProgress = vi.fn();

      await service.analyzeGame('game123', testFens, testMoves, 'white', { onProgress });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenLastCalledWith(100, 'Analysis complete');
    });

    it('handles black player color', async () => {
      const result = await service.analyzeGame('game123', testFens, testMoves, 'black');

      const playerMoves = result.moves.filter((_, i) => i % 2 === 1);
      const opponentMoves = result.moves.filter((_, i) => i % 2 === 0);

      expect(playerMoves.every(m => m.cpLoss >= 0)).toBe(true);
      expect(opponentMoves.every(m => m.cpLoss === 0)).toBe(true);
    });
  });

  describe('quickAnalysis', () => {
    const testFens = Array(20).fill('test-fen');
    const testMoves = Array(19).fill('e2e4');

    beforeEach(() => {
      mockGetCloudEval.mockResolvedValue(mockCloudEval);
    });

    it('samples positions for speed', async () => {
      await service.quickAnalysis('game123', testFens, testMoves, 'white');

      const cloudCalls = mockGetCloudEval.mock.calls.length;
      expect(cloudCalls).toBeLessThan(testFens.length * 2);
    });

    it('returns summary statistics', async () => {
      const result = await service.quickAnalysis('game123', testFens, testMoves, 'white');

      expect(result.gameId).toBe('game123');
      expect(typeof result.accuracy).toBe('number');
      expect(typeof result.blunders).toBe('number');
      expect(typeof result.mistakes).toBe('number');
      expect(typeof result.inaccuracies).toBe('number');
      expect(typeof result.acpl).toBe('number');
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('extrapolates counts to full game', async () => {
      const result = await service.quickAnalysis('game123', testFens, testMoves, 'white');

      expect(result.blunders).toBeGreaterThanOrEqual(0);
      expect(result.mistakes).toBeGreaterThanOrEqual(0);
      expect(result.inaccuracies).toBeGreaterThanOrEqual(0);
    });

    it('handles empty game', async () => {
      const result = await service.quickAnalysis('game123', [], [], 'white');

      expect(result.gameId).toBe('game123');
      expect(result.acpl).toBe(0);
    });
  });

  describe('getAnalysisService', () => {
    it('returns singleton instance', () => {
      const instance1 = getAnalysisService();
      const instance2 = getAnalysisService();

      expect(instance1).toBe(instance2);
    });
  });
});
