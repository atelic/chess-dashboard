import { describe, it, expect } from 'vitest';
import {
  createGame,
  getSourceDisplayName,
  getResultIcon,
  getResultColorClass,
  formatTermination,
  isWin,
  isLoss,
  isDraw,
} from '@/lib/domain/models/Game';
import type { Game, TerminationType } from '@/lib/domain/models/Game';

// Helper to create base game data
function createBaseGameData(): Omit<Game, 'id'> {
  return {
    source: 'chesscom',
    playedAt: new Date('2024-06-15T10:00:00Z'),
    timeClass: 'blitz',
    playerColor: 'white',
    result: 'win',
    opening: { eco: 'B20', name: 'Sicilian Defense' },
    opponent: { username: 'opponent123', rating: 1500 },
    playerRating: 1550,
    termination: 'checkmate',
    moveCount: 30,
    rated: true,
    gameUrl: 'https://chess.com/game/123',
  };
}

describe('Game domain model', () => {
  describe('createGame()', () => {
    it('should create a game with provided ID', () => {
      const data = { ...createBaseGameData(), id: 'my-custom-id' };
      const game = createGame(data);

      expect(game.id).toBe('my-custom-id');
    });

    it('should generate ID if not provided', () => {
      const data = createBaseGameData();
      const game = createGame(data);

      expect(game.id).toBeDefined();
      expect(game.id).toContain('chesscom');
      expect(game.id).toContain('opponent12'); // truncated opponent name
    });

    it('should set all required fields correctly', () => {
      const data = createBaseGameData();
      const game = createGame(data);

      expect(game.source).toBe('chesscom');
      expect(game.playedAt).toEqual(new Date('2024-06-15T10:00:00Z'));
      expect(game.timeClass).toBe('blitz');
      expect(game.playerColor).toBe('white');
      expect(game.result).toBe('win');
      expect(game.opening.eco).toBe('B20');
      expect(game.opening.name).toBe('Sicilian Defense');
      expect(game.opponent.username).toBe('opponent123');
      expect(game.opponent.rating).toBe(1500);
      expect(game.playerRating).toBe(1550);
      expect(game.termination).toBe('checkmate');
      expect(game.moveCount).toBe(30);
      expect(game.rated).toBe(true);
      expect(game.gameUrl).toBe('https://chess.com/game/123');
    });

    it('should include optional clock data when provided', () => {
      const data = {
        ...createBaseGameData(),
        clock: {
          initialTime: 180,
          increment: 0,
          timeRemaining: 45,
          avgMoveTime: 5.5,
        },
      };
      const game = createGame(data);

      expect(game.clock).toBeDefined();
      expect(game.clock?.initialTime).toBe(180);
      expect(game.clock?.increment).toBe(0);
      expect(game.clock?.timeRemaining).toBe(45);
      expect(game.clock?.avgMoveTime).toBe(5.5);
    });

    it('should include optional analysis data when provided', () => {
      const data = {
        ...createBaseGameData(),
        analysis: {
          accuracy: 85.5,
          blunders: 2,
          mistakes: 3,
          inaccuracies: 5,
          acpl: 32,
        },
      };
      const game = createGame(data);

      expect(game.analysis).toBeDefined();
      expect(game.analysis?.accuracy).toBe(85.5);
      expect(game.analysis?.blunders).toBe(2);
      expect(game.analysis?.mistakes).toBe(3);
      expect(game.analysis?.inaccuracies).toBe(5);
      expect(game.analysis?.acpl).toBe(32);
    });

    it('should handle userId when provided', () => {
      const data = { ...createBaseGameData(), userId: 1 };
      const game = createGame(data);

      expect(game.userId).toBe(1);
    });
  });

  describe('getSourceDisplayName()', () => {
    it('should return "Chess.com" for chesscom source', () => {
      expect(getSourceDisplayName('chesscom')).toBe('Chess.com');
    });

    it('should return "Lichess" for lichess source', () => {
      expect(getSourceDisplayName('lichess')).toBe('Lichess');
    });
  });

  describe('getResultIcon()', () => {
    it('should return checkmark for win', () => {
      expect(getResultIcon('win')).toBe('✓');
    });

    it('should return X for loss', () => {
      expect(getResultIcon('loss')).toBe('✗');
    });

    it('should return half for draw', () => {
      expect(getResultIcon('draw')).toBe('½');
    });
  });

  describe('getResultColorClass()', () => {
    it('should return green class for win', () => {
      expect(getResultColorClass('win')).toBe('text-green-400');
    });

    it('should return red class for loss', () => {
      expect(getResultColorClass('loss')).toBe('text-red-400');
    });

    it('should return zinc class for draw', () => {
      expect(getResultColorClass('draw')).toBe('text-zinc-400');
    });
  });

  describe('formatTermination()', () => {
    const terminationCases: [TerminationType, string][] = [
      ['checkmate', 'Checkmate'],
      ['resignation', 'Resignation'],
      ['timeout', 'Timeout'],
      ['stalemate', 'Stalemate'],
      ['insufficient', 'Insufficient Material'],
      ['repetition', 'Repetition'],
      ['agreement', 'Draw Agreement'],
      ['abandoned', 'Abandoned'],
      ['other', 'Other'],
    ];

    terminationCases.forEach(([termination, expected]) => {
      it(`should format ${termination} as "${expected}"`, () => {
        expect(formatTermination(termination)).toBe(expected);
      });
    });
  });

  describe('isWin()', () => {
    it('should return true for winning game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'win' });
      expect(isWin(game)).toBe(true);
    });

    it('should return false for losing game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'loss' });
      expect(isWin(game)).toBe(false);
    });

    it('should return false for drawn game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'draw' });
      expect(isWin(game)).toBe(false);
    });
  });

  describe('isLoss()', () => {
    it('should return true for losing game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'loss' });
      expect(isLoss(game)).toBe(true);
    });

    it('should return false for winning game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'win' });
      expect(isLoss(game)).toBe(false);
    });

    it('should return false for drawn game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'draw' });
      expect(isLoss(game)).toBe(false);
    });
  });

  describe('isDraw()', () => {
    it('should return true for drawn game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'draw' });
      expect(isDraw(game)).toBe(true);
    });

    it('should return false for winning game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'win' });
      expect(isDraw(game)).toBe(false);
    });

    it('should return false for losing game', () => {
      const game = createGame({ ...createBaseGameData(), result: 'loss' });
      expect(isDraw(game)).toBe(false);
    });
  });
});
