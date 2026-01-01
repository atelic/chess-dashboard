import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createUserData,
  hasAnyPlatform,
  hasChessCom,
  hasLichess,
  getPlatformDisplayText,
  formatLastSynced,
} from '@/lib/domain/models/User';
import type { User } from '@/lib/domain/models/User';
import { createTestUser, createChessComOnlyUser, createLichessOnlyUser, createNoPlatformUser } from '@/__tests__/fixtures/user';

describe('User domain model', () => {
  describe('createUserData()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create user data with chesscom username', () => {
      const userData = createUserData({ chesscomUsername: 'testuser' });

      expect(userData.chesscomUsername).toBe('testuser');
      expect(userData.lichessUsername).toBeNull();
    });

    it('should create user data with lichess username', () => {
      const userData = createUserData({ lichessUsername: 'testuser' });

      expect(userData.chesscomUsername).toBeNull();
      expect(userData.lichessUsername).toBe('testuser');
    });

    it('should create user data with both usernames', () => {
      const userData = createUserData({
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });

      expect(userData.chesscomUsername).toBe('chessuser');
      expect(userData.lichessUsername).toBe('lichessuser');
    });

    it('should set createdAt to current date', () => {
      const userData = createUserData({ chesscomUsername: 'testuser' });

      expect(userData.createdAt).toEqual(new Date('2024-06-15T10:00:00Z'));
    });

    it('should set lastSyncedAt to null', () => {
      const userData = createUserData({ chesscomUsername: 'testuser' });

      expect(userData.lastSyncedAt).toBeNull();
    });

    it('should convert empty string to null for chesscom', () => {
      const userData = createUserData({ chesscomUsername: '' });

      expect(userData.chesscomUsername).toBeNull();
    });

    it('should convert undefined to null', () => {
      const userData = createUserData({});

      expect(userData.chesscomUsername).toBeNull();
      expect(userData.lichessUsername).toBeNull();
    });
  });

  describe('hasAnyPlatform()', () => {
    it('should return true when chesscom configured', () => {
      const user = createChessComOnlyUser();
      expect(hasAnyPlatform(user)).toBe(true);
    });

    it('should return true when lichess configured', () => {
      const user = createLichessOnlyUser();
      expect(hasAnyPlatform(user)).toBe(true);
    });

    it('should return true when both platforms configured', () => {
      const user = createTestUser();
      expect(hasAnyPlatform(user)).toBe(true);
    });

    it('should return false when neither platform configured', () => {
      const user = createNoPlatformUser();
      expect(hasAnyPlatform(user)).toBe(false);
    });
  });

  describe('hasChessCom()', () => {
    it('should return true when chesscom is configured', () => {
      const user = createChessComOnlyUser();
      expect(hasChessCom(user)).toBe(true);
    });

    it('should return false when chesscom is not configured', () => {
      const user = createLichessOnlyUser();
      expect(hasChessCom(user)).toBe(false);
    });

    it('should return false when chesscom is null', () => {
      const user = createTestUser({ chesscomUsername: null });
      expect(hasChessCom(user)).toBe(false);
    });
  });

  describe('hasLichess()', () => {
    it('should return true when lichess is configured', () => {
      const user = createLichessOnlyUser();
      expect(hasLichess(user)).toBe(true);
    });

    it('should return false when lichess is not configured', () => {
      const user = createChessComOnlyUser();
      expect(hasLichess(user)).toBe(false);
    });

    it('should return false when lichess is null', () => {
      const user = createTestUser({ lichessUsername: null });
      expect(hasLichess(user)).toBe(false);
    });
  });

  describe('getPlatformDisplayText()', () => {
    it('should return Chess.com format for chesscom only user', () => {
      const user = createChessComOnlyUser();
      expect(getPlatformDisplayText(user)).toBe('Chess.com: chesscomuser');
    });

    it('should return Lichess format for lichess only user', () => {
      const user = createLichessOnlyUser();
      expect(getPlatformDisplayText(user)).toBe('Lichess: lichessuser');
    });

    it('should return combined text for both platforms', () => {
      const user = createTestUser({
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });
      expect(getPlatformDisplayText(user)).toBe('Chess.com: chessuser, Lichess: lichessuser');
    });

    it('should return "No platforms configured" when no platforms', () => {
      const user = createNoPlatformUser();
      expect(getPlatformDisplayText(user)).toBe('No platforms configured');
    });
  });

  describe('formatLastSynced()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Never synced" when lastSyncedAt is null', () => {
      const user = createTestUser({ lastSyncedAt: null });
      expect(formatLastSynced(user)).toBe('Never synced');
    });

    it('should return "Just now" for recent sync (less than 1 minute)', () => {
      vi.setSystemTime(new Date('2024-06-15T10:00:30Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('Just now');
    });

    it('should return "1 minute ago" for 1 minute', () => {
      vi.setSystemTime(new Date('2024-06-15T10:01:00Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('1 minute ago');
    });

    it('should return "X minutes ago" for multiple minutes', () => {
      vi.setSystemTime(new Date('2024-06-15T10:30:00Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('30 minutes ago');
    });

    it('should return "1 hour ago" for 1 hour', () => {
      vi.setSystemTime(new Date('2024-06-15T11:00:00Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('1 hour ago');
    });

    it('should return "X hours ago" for multiple hours', () => {
      vi.setSystemTime(new Date('2024-06-15T15:00:00Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('5 hours ago');
    });

    it('should return "1 day ago" for 1 day', () => {
      vi.setSystemTime(new Date('2024-06-16T10:00:00Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('1 day ago');
    });

    it('should return "X days ago" for multiple days', () => {
      vi.setSystemTime(new Date('2024-06-20T10:00:00Z'));
      const user = createTestUser({ lastSyncedAt: new Date('2024-06-15T10:00:00Z') });
      expect(formatLastSynced(user)).toBe('5 days ago');
    });
  });
});
