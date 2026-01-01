import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TursoUserRepository } from '@/lib/infrastructure/database/repositories/TursoUserRepository';
import { UserNotFoundError } from '@/lib/shared/errors';
import {
  TestDatabaseClient,
  createTestDatabase,
  clearTestData,
} from '@/__tests__/fixtures/test-db';

describe('TursoUserRepository', () => {
  let db: TestDatabaseClient;
  let repository: TursoUserRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new TursoUserRepository(db as never);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  describe('create()', () => {
    it('should create user with auto-increment ID', async () => {
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });

      expect(user.id).toBeGreaterThan(0);
    });

    it('should set chesscom username', async () => {
      const user = await repository.create({
        chesscomUsername: 'chessuser',
      });

      expect(user.chesscomUsername).toBe('chessuser');
    });

    it('should set lichess username', async () => {
      const user = await repository.create({
        lichessUsername: 'lichessuser',
      });

      expect(user.lichessUsername).toBe('lichessuser');
    });

    it('should set both usernames', async () => {
      const user = await repository.create({
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });

      expect(user.chesscomUsername).toBe('chessuser');
      expect(user.lichessUsername).toBe('lichessuser');
    });

    it('should set created_at timestamp', async () => {
      const before = new Date();
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });
      const after = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set lastSyncedAt to null initially', async () => {
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });

      expect(user.lastSyncedAt).toBeNull();
    });

    it('should handle null usernames', async () => {
      const user = await repository.create({
        chesscomUsername: null,
        lichessUsername: 'lichessonly',
      });

      expect(user.chesscomUsername).toBeNull();
      expect(user.lichessUsername).toBe('lichessonly');
    });
  });

  describe('findById()', () => {
    it('should return user when found', async () => {
      const created = await repository.create({
        chesscomUsername: 'testuser',
      });

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.chesscomUsername).toBe('testuser');
    });

    it('should return null when not found', async () => {
      const found = await repository.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findFirst()', () => {
    it('should return first user', async () => {
      await repository.create({ chesscomUsername: 'user1' });
      await repository.create({ chesscomUsername: 'user2' });

      const first = await repository.findFirst();

      expect(first).not.toBeNull();
      expect(first?.chesscomUsername).toBe('user1');
    });

    it('should return null when no users', async () => {
      const first = await repository.findFirst();

      expect(first).toBeNull();
    });
  });

  describe('exists()', () => {
    it('should return true when user exists', async () => {
      await repository.create({ chesscomUsername: 'testuser' });

      const exists = await repository.exists();

      expect(exists).toBe(true);
    });

    it('should return false when no users', async () => {
      const exists = await repository.exists();

      expect(exists).toBe(false);
    });
  });

  describe('update()', () => {
    it('should update chesscom username', async () => {
      const user = await repository.create({
        chesscomUsername: 'oldname',
      });

      const updated = await repository.update(user.id, {
        chesscomUsername: 'newname',
      });

      expect(updated.chesscomUsername).toBe('newname');
    });

    it('should update lichess username', async () => {
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });

      const updated = await repository.update(user.id, {
        lichessUsername: 'lichessuser',
      });

      expect(updated.lichessUsername).toBe('lichessuser');
    });

    it('should preserve other fields when updating one', async () => {
      const user = await repository.create({
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });

      const updated = await repository.update(user.id, {
        chesscomUsername: 'newchessuser',
      });

      expect(updated.lichessUsername).toBe('lichessuser');
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(
        repository.update(99999, { chesscomUsername: 'test' })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should return unchanged user when no updates provided', async () => {
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });

      const updated = await repository.update(user.id, {});

      expect(updated.chesscomUsername).toBe('testuser');
    });

    it('should allow setting username to null', async () => {
      const user = await repository.create({
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });

      const updated = await repository.update(user.id, {
        chesscomUsername: null,
      });

      expect(updated.chesscomUsername).toBeNull();
      expect(updated.lichessUsername).toBe('lichessuser');
    });
  });

  describe('updateLastSynced()', () => {
    it('should update last_synced_at timestamp', async () => {
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });
      expect(user.lastSyncedAt).toBeNull();

      const syncDate = new Date('2024-06-15T12:00:00Z');
      await repository.updateLastSynced(user.id, syncDate);

      const updated = await repository.findById(user.id);
      expect(updated?.lastSyncedAt?.toISOString()).toBe(syncDate.toISOString());
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(
        repository.updateLastSynced(99999, new Date())
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('delete()', () => {
    it('should delete user', async () => {
      const user = await repository.create({
        chesscomUsername: 'testuser',
      });

      await repository.delete(user.id);

      const found = await repository.findById(user.id);
      expect(found).toBeNull();
    });

    it('should not throw for non-existent user', async () => {
      // SQLite DELETE doesn't throw on non-existent rows
      await expect(repository.delete(99999)).resolves.not.toThrow();
    });
  });
});
