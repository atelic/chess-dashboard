import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, DELETE } from '@/app/api/sync/route';
import { NextRequest } from 'next/server';

const mockUser = {
  id: 1,
  chesscomUsername: 'testuser',
  lichessUsername: 'testuser_lichess',
  createdAt: new Date('2024-01-01'),
  lastSyncedAt: new Date('2024-01-15'),
};

const mockSyncResult = {
  success: true,
  newGamesCount: 10,
  totalGamesCount: 100,
  sources: ['lichess', 'chesscom'],
};

const mockUserService = {
  getCurrentUser: vi.fn(),
};

const mockSyncService = {
  syncGames: vi.fn(),
  fullResync: vi.fn(),
};

vi.mock('@/lib/infrastructure/factories', () => ({
  createUserService: vi.fn(() => Promise.resolve(mockUserService)),
  createSyncService: vi.fn(() => Promise.resolve(mockSyncService)),
}));

vi.mock('@/lib/shared/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 4, resetTime: Date.now() + 60000 })),
  getClientIdentifier: vi.fn(() => 'test-client'),
  RATE_LIMITS: {
    sync: { windowMs: 60000, maxRequests: 5 },
    analysis: { windowMs: 60000, maxRequests: 10 },
    api: { windowMs: 60000, maxRequests: 100 },
  },
}));

import { checkRateLimit } from '@/lib/shared/rate-limit';
const mockCheckRateLimit = vi.mocked(checkRateLimit);

function createRequest(body?: object): NextRequest {
  return new NextRequest('http://localhost/api/sync', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('API: /api/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/sync', () => {
    it('returns 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
      });

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('returns 404 when no user exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('performs incremental sync by default', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockSyncService.syncGames.mockResolvedValue(mockSyncResult);

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newGamesCount).toBe(10);
      expect(mockSyncService.syncGames).toHaveBeenCalledWith(1, { fullSync: false });
    });

    it('performs full sync when requested', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockSyncService.syncGames.mockResolvedValue(mockSyncResult);

      const request = createRequest({ fullSync: true });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSyncService.syncGames).toHaveBeenCalledWith(1, { fullSync: true });
    });

    it('returns 400 when fullSync is not boolean', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);

      const request = createRequest({ fullSync: 'true' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handles missing body gracefully', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockSyncService.syncGames.mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost/api/sync', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSyncService.syncGames).toHaveBeenCalledWith(1, { fullSync: false });
    });

    it('returns 500 on sync error', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockSyncService.syncGames.mockRejectedValue(new Error('Sync failed'));

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/sync', () => {
    it('returns 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
      });

      const request = new NextRequest('http://localhost/api/sync', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('returns 404 when no user exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/sync', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('performs full resync successfully', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockSyncService.fullResync.mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost/api/sync', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalGamesCount).toBe(100);
      expect(mockSyncService.fullResync).toHaveBeenCalledWith(1);
    });

    it('returns 500 on resync error', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockSyncService.fullResync.mockRejectedValue(new Error('Resync failed'));

      const request = new NextRequest('http://localhost/api/sync', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });
});
