import type { Game } from '@/lib/domain/models/Game';

let gameIdCounter = 0;

/**
 * Reset the game ID counter (call in beforeEach if needed)
 */
export function resetGameIdCounter(): void {
  gameIdCounter = 0;
}

/**
 * Create a test game with sensible defaults
 */
export function createTestGame(overrides: Partial<Game> = {}): Game {
  const id = overrides.id || `test-game-${++gameIdCounter}`;
  return {
    id,
    source: 'chesscom',
    playedAt: new Date('2024-06-15T10:30:00Z'),
    timeClass: 'blitz',
    playerColor: 'white',
    result: 'win',
    opening: { eco: 'B20', name: 'Sicilian Defense' },
    opponent: { username: 'opponent123', rating: 1500 },
    playerRating: 1550,
    termination: 'checkmate',
    moveCount: 30,
    rated: true,
    gameUrl: `https://chess.com/game/${id}`,
    ratingChange: 8,
    ...overrides,
  };
}

/**
 * Create multiple test games
 */
export function createTestGames(
  count: number,
  factory?: (index: number) => Partial<Game>
): Game[] {
  return Array.from({ length: count }, (_, i) =>
    createTestGame(factory ? factory(i) : {})
  );
}

/**
 * Create a winning game
 */
export function createWinGame(overrides?: Partial<Game>): Game {
  return createTestGame({ result: 'win', ratingChange: 8, ...overrides });
}

/**
 * Create a losing game
 */
export function createLossGame(overrides?: Partial<Game>): Game {
  return createTestGame({ result: 'loss', ratingChange: -8, ...overrides });
}

/**
 * Create a draw game
 */
export function createDrawGame(overrides?: Partial<Game>): Game {
  return createTestGame({ result: 'draw', ratingChange: 0, ...overrides });
}

/**
 * Create a Lichess game
 */
export function createLichessGame(overrides?: Partial<Game>): Game {
  return createTestGame({
    source: 'lichess',
    gameUrl: `https://lichess.org/test${++gameIdCounter}`,
    ...overrides,
  });
}

/**
 * Create a game with clock data
 */
export function createGameWithClock(overrides?: Partial<Game>): Game {
  return createTestGame({
    clock: {
      initialTime: 180,
      increment: 0,
      timeRemaining: 45,
      avgMoveTime: 5.5,
      moveTimes: [3, 5, 8, 4, 6, 5, 7, 4, 5, 6],
    },
    ...overrides,
  });
}

/**
 * Create a game with analysis data
 */
export function createGameWithAnalysis(overrides?: Partial<Game>): Game {
  return createTestGame({
    analysis: {
      accuracy: 85.5,
      blunders: 2,
      mistakes: 3,
      inaccuracies: 5,
      acpl: 32,
      analyzedAt: new Date('2024-06-15T12:00:00Z'),
    },
    ...overrides,
  });
}

/**
 * Create games with varied results for stats testing
 */
export function createMixedResultGames(): Game[] {
  return [
    createTestGame({ id: 'win-1', result: 'win' }),
    createTestGame({ id: 'win-2', result: 'win' }),
    createTestGame({ id: 'win-3', result: 'win' }),
    createTestGame({ id: 'loss-1', result: 'loss' }),
    createTestGame({ id: 'loss-2', result: 'loss' }),
    createTestGame({ id: 'draw-1', result: 'draw' }),
  ];
}

/**
 * Create games with varied openings for opening stats testing
 */
export function createVariedOpeningGames(): Game[] {
  return [
    createTestGame({ id: 'sicilian-1', opening: { eco: 'B20', name: 'Sicilian Defense' }, result: 'win' }),
    createTestGame({ id: 'sicilian-2', opening: { eco: 'B20', name: 'Sicilian Defense' }, result: 'win' }),
    createTestGame({ id: 'sicilian-3', opening: { eco: 'B20', name: 'Sicilian Defense' }, result: 'loss' }),
    createTestGame({ id: 'italian-1', opening: { eco: 'C50', name: 'Italian Game' }, result: 'win' }),
    createTestGame({ id: 'italian-2', opening: { eco: 'C50', name: 'Italian Game' }, result: 'draw' }),
    createTestGame({ id: 'french-1', opening: { eco: 'C00', name: 'French Defense' }, result: 'loss' }),
  ];
}

/**
 * Create games against varied opponents for opponent stats testing
 */
export function createVariedOpponentGames(): Game[] {
  return [
    createTestGame({ id: 'opp1-1', opponent: { username: 'player1', rating: 1500 }, result: 'win' }),
    createTestGame({ id: 'opp1-2', opponent: { username: 'player1', rating: 1520 }, result: 'win' }),
    createTestGame({ id: 'opp1-3', opponent: { username: 'Player1', rating: 1510 }, result: 'loss' }), // Case variation
    createTestGame({ id: 'opp2-1', opponent: { username: 'player2', rating: 1600 }, result: 'loss' }),
    createTestGame({ id: 'opp2-2', opponent: { username: 'player2', rating: 1620 }, result: 'loss' }),
    createTestGame({ id: 'opp3-1', opponent: { username: 'player3', rating: 1400 }, result: 'draw' }),
  ];
}
