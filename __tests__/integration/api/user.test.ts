import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/user/route';
import { NextRequest } from 'next/server';

const mockUser = {
  id: 1,
  chesscomUsername: 'testuser',
  lichessUsername: 'testuser_lichess',
  createdAt: new Date('2024-01-01'),
  lastSyncedAt: new Date('2024-01-15'),
};

const mockUserService = {
  getCurrentUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
};

vi.mock('@/lib/infrastructure/factories', () => ({
  createUserService: vi.fn(() => Promise.resolve(mockUserService)),
}));

describe('API: /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/user', () => {
    it('returns null when no user exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
    });

    it('returns user data when user exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: 1,
        chesscomUsername: 'testuser',
        lichessUsername: 'testuser_lichess',
        createdAt: mockUser.createdAt.toISOString(),
        lastSyncedAt: mockUser.lastSyncedAt.toISOString(),
      });
    });

    it('returns 500 on internal error', async () => {
      mockUserService.getCurrentUser.mockRejectedValue(new Error('DB error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/user', () => {
    it('creates new user when none exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/user', {
        method: 'POST',
        body: JSON.stringify({
          chesscomUsername: 'testuser',
          lichessUsername: 'testuser_lichess',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        chesscomUsername: 'testuser',
        lichessUsername: 'testuser_lichess',
      });
      expect(data.user.chesscomUsername).toBe('testuser');
    });

    it('updates existing user', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockUserService.updateUser.mockResolvedValue({
        ...mockUser,
        chesscomUsername: 'newuser',
      });

      const request = new NextRequest('http://localhost/api/user', {
        method: 'POST',
        body: JSON.stringify({
          chesscomUsername: 'newuser',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(1, {
        chesscomUsername: 'newuser',
        lichessUsername: null,
      });
      expect(data.user.chesscomUsername).toBe('newuser');
    });

    it('returns 400 when no username provided', async () => {
      const request = new NextRequest('http://localhost/api/user', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid username format', async () => {
      const request = new NextRequest('http://localhost/api/user', {
        method: 'POST',
        body: JSON.stringify({
          chesscomUsername: 'invalid user!@#',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('accepts valid usernames with underscore and hyphen', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({
        ...mockUser,
        chesscomUsername: 'test_user-123',
      });

      const request = new NextRequest('http://localhost/api/user', {
        method: 'POST',
        body: JSON.stringify({
          chesscomUsername: 'test_user-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.chesscomUsername).toBe('test_user-123');
    });
  });

  describe('DELETE /api/user', () => {
    it('returns 404 when no user exists', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('deletes user successfully', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockUserService.deleteUser.mockResolvedValue(undefined);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(1);
    });

    it('returns 500 on delete error', async () => {
      mockUserService.getCurrentUser.mockResolvedValue(mockUser);
      mockUserService.deleteUser.mockRejectedValue(new Error('DB error'));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });
});
