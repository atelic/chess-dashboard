import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/games/route';
import { NextRequest } from 'next/server';

const mockUser = {
  id: 1,
  chesscomUsername: 'testuser',
  lichessUsername: 'testuser_lichess',
  createdAt: new Date('2024-01-01'),
  lastSyncedAt: new Date('2024-01-15'),
};

const mockGames = [
  {
    id: 'game1',
    source: 'lichess' as const,
    playedAt: new Date('2024-01-10'),
    timeClass: 'blitz' as const,
    playerColor: 'white' as const,
    result: 'win' as const,
    opening: { eco: 'B20', name: 'Sicilian Defense' },
    opponent: { username: 'opponent1', rating: 1500 },
    playerRating: 1600,
    termination: 'checkmate' as const,
    moveCount: 35,
    ratingChange: 8,
    rated: true,
    gameUrl: 'https://lichess.org/game1',
  },
  {
    id: 'game2',
    source: 'chesscom' as const,
    playedAt: new Date('2024-01-11'),
    timeClass: 'rapid' as const,
    playerColor: 'black' as const,
    result: 'loss' as const,
    opening: { eco: 'C50', name: 'Italian Game' },
    opponent: { username: 'opponent2', rating: 1700 },
    playerRating: 1590,
    termination: 'resignation' as const,
    moveCount: 42,
    ratingChange: -10,
    rated: true,
    gameUrl: 'https://chess.com/game2',
  },
];

const mockUserService = {
  getCurrentUser: vi.fn(),
};

const mockGameService = {
  getGamesPaginated: vi.fn(),
};

vi.mock('@/lib/infrastructure/factories', () => ({
  createUserService: vi.fn(() => Promise.resolve(mockUserService)),
  createGameService: vi.fn(() => Promise.resolve(mockGameService)),
}));

function createRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`);
}

describe('API: /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/games', () => {
    it('returns 404 when no user exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);

      const request = createRequest('/api/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('returns games with pagination metadata', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: mockGames,
        total: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.games).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(100);
      expect(data.offset).toBe(0);
      expect(data.hasMore).toBe(false);
    });

    it('serializes dates as ISO strings', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: mockGames,
        total: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games');
      const response = await GET(request);
      const data = await response.json();

      expect(data.games[0].playedAt).toBe('2024-01-10T00:00:00.000Z');
    });

    it('sets cache headers', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=60, stale-while-revalidate=300'
      );
    });

    it('applies pagination parameters', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: [mockGames[1]],
        total: 2,
        limit: 1,
        offset: 1,
        hasMore: false,
      });

      const request = createRequest('/api/games?limit=1&offset=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.games).toHaveLength(1);
      expect(data.limit).toBe(1);
      expect(data.offset).toBe(1);
    });

    it('caps limit at MAX_LIMIT (1000)', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        limit: 1000,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games?limit=5000');
      await GET(request);

      expect(mockGameService.getGamesPaginated).toHaveBeenCalledWith(
        1,
        undefined,
        { limit: 1000, offset: 0 }
      );
    });

    it('validates color parameter', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);

      const request = createRequest('/api/games?color=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.field).toBe('playerColor');
    });

    it('validates result parameter', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);

      const request = createRequest('/api/games?result=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.field).toBe('result');
    });

    it('validates eco parameter', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);

      const request = createRequest('/api/games?eco=INVALID');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('accepts valid filter parameters', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: [mockGames[0]],
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games?color=white&result=win&eco=B20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.games).toHaveLength(1);
    });

    it('disables pagination when paginate=false', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: mockGames,
        total: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games?paginate=false');
      await GET(request);

      expect(mockGameService.getGamesPaginated).toHaveBeenCalledWith(
        1,
        undefined,
        undefined
      );
    });

    it('returns 500 on internal error', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockRejectedValue(new Error('DB error'));

      const request = createRequest('/api/games');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('includes analysis data when present', async () => {
      const gameWithAnalysis = {
        ...mockGames[0],
        analysis: {
          accuracy: 85.5,
          blunders: 1,
          mistakes: 2,
          inaccuracies: 3,
          acpl: 25,
          analyzedAt: new Date('2024-01-12'),
        },
      };
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockGameService.getGamesPaginated.mockResolvedValue({
        data: [gameWithAnalysis],
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const request = createRequest('/api/games');
      const response = await GET(request);
      const data = await response.json();

      expect(data.games[0].analysis).toEqual({
        accuracy: 85.5,
        blunders: 1,
        mistakes: 2,
        inaccuracies: 3,
        acpl: 25,
        analyzedAt: '2024-01-12T00:00:00.000Z',
      });
    });
  });
});
