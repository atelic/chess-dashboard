import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/lib/domain/services/UserService';
import type { IUserRepository } from '@/lib/domain/repositories/interfaces';
import { UserNotFoundError, UserExistsError, ValidationError } from '@/lib/shared/errors';
import { createTestUser, createChessComOnlyUser } from '@/__tests__/fixtures/user';

describe('UserService', () => {
  // Mock repository
  const mockUserRepo: IUserRepository = {
    findFirst: vi.fn(),
    findById: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateLastSynced: vi.fn(),
  };

  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService(mockUserRepo);
  });

  describe('getCurrentUser()', () => {
    it('should return first user from repository', async () => {
      const user = createTestUser();
      vi.mocked(mockUserRepo.findFirst).mockResolvedValue(user);

      const result = await service.getCurrentUser();

      expect(result).toEqual(user);
      expect(mockUserRepo.findFirst).toHaveBeenCalledOnce();
    });

    it('should return null when no user exists', async () => {
      vi.mocked(mockUserRepo.findFirst).mockResolvedValue(null);

      const result = await service.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getUserById()', () => {
    it('should return user when found', async () => {
      const user = createTestUser({ id: 1 });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);

      const result = await service.getUserById(1);

      expect(result).toEqual(user);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(UserNotFoundError);
    });

    it('should include userId in error message', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.getUserById(42)).rejects.toThrow('User 42 not found');
    });
  });

  describe('hasUser()', () => {
    it('should return true when user exists', async () => {
      vi.mocked(mockUserRepo.exists).mockResolvedValue(true);

      const result = await service.hasUser();

      expect(result).toBe(true);
      expect(mockUserRepo.exists).toHaveBeenCalledOnce();
    });

    it('should return false when no user exists', async () => {
      vi.mocked(mockUserRepo.exists).mockResolvedValue(false);

      const result = await service.hasUser();

      expect(result).toBe(false);
    });
  });

  describe('createUser()', () => {
    it('should create user with valid data', async () => {
      const newUser = createChessComOnlyUser();
      vi.mocked(mockUserRepo.exists).mockResolvedValue(false);
      vi.mocked(mockUserRepo.create).mockResolvedValue(newUser);

      const result = await service.createUser({ chesscomUsername: 'testuser' });

      expect(result).toEqual(newUser);
      expect(mockUserRepo.create).toHaveBeenCalledWith({ chesscomUsername: 'testuser' });
    });

    it('should create user with both platforms', async () => {
      const newUser = createTestUser();
      vi.mocked(mockUserRepo.exists).mockResolvedValue(false);
      vi.mocked(mockUserRepo.create).mockResolvedValue(newUser);

      const result = await service.createUser({
        chesscomUsername: 'chessuser',
        lichessUsername: 'lichessuser',
      });

      expect(result).toEqual(newUser);
    });

    it('should throw ValidationError when no platform provided', async () => {
      await expect(service.createUser({})).rejects.toThrow(ValidationError);
      await expect(service.createUser({})).rejects.toThrow(
        'At least one chess platform username is required'
      );
    });

    it('should throw ValidationError when both platforms are null', async () => {
      await expect(
        service.createUser({ chesscomUsername: null, lichessUsername: null })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw UserExistsError when user already exists', async () => {
      vi.mocked(mockUserRepo.exists).mockResolvedValue(true);

      await expect(service.createUser({ chesscomUsername: 'testuser' })).rejects.toThrow(
        UserExistsError
      );
    });

    it('should not call create when validation fails', async () => {
      await expect(service.createUser({})).rejects.toThrow();

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should not call create when user already exists', async () => {
      vi.mocked(mockUserRepo.exists).mockResolvedValue(true);

      await expect(service.createUser({ chesscomUsername: 'testuser' })).rejects.toThrow();

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser()', () => {
    it('should update existing user', async () => {
      const existingUser = createTestUser({ id: 1 });
      const updatedUser = { ...existingUser, chesscomUsername: 'newusername' };

      vi.mocked(mockUserRepo.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepo.update).mockResolvedValue(updatedUser);

      const result = await service.updateUser(1, { chesscomUsername: 'newusername' });

      expect(result).toEqual(updatedUser);
      expect(mockUserRepo.update).toHaveBeenCalledWith(1, { chesscomUsername: 'newusername' });
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.updateUser(999, { chesscomUsername: 'new' })).rejects.toThrow(
        UserNotFoundError
      );
    });

    it('should throw ValidationError when removing all platforms', async () => {
      const existingUser = createChessComOnlyUser({ id: 1 });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(existingUser);

      await expect(service.updateUser(1, { chesscomUsername: null })).rejects.toThrow(
        ValidationError
      );
    });

    it('should allow updating one platform while keeping the other', async () => {
      const existingUser = createTestUser({ id: 1 });
      const updatedUser = { ...existingUser, chesscomUsername: 'newchessuser' };

      vi.mocked(mockUserRepo.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepo.update).mockResolvedValue(updatedUser);

      const result = await service.updateUser(1, { chesscomUsername: 'newchessuser' });

      expect(result.chesscomUsername).toBe('newchessuser');
    });

    it('should allow removing one platform if other remains', async () => {
      const existingUser = createTestUser({ id: 1 });
      const updatedUser = { ...existingUser, chesscomUsername: null };

      vi.mocked(mockUserRepo.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepo.update).mockResolvedValue(updatedUser);

      const result = await service.updateUser(1, { chesscomUsername: null });

      expect(result.chesscomUsername).toBeNull();
      expect(result.lichessUsername).toBe(existingUser.lichessUsername);
    });

    it('should not call update when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.updateUser(999, { chesscomUsername: 'new' })).rejects.toThrow();

      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser()', () => {
    it('should delete existing user', async () => {
      const user = createTestUser({ id: 1 });
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepo.delete).mockResolvedValue();

      await service.deleteUser(1);

      expect(mockUserRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.deleteUser(999)).rejects.toThrow(UserNotFoundError);
    });

    it('should not call delete when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(service.deleteUser(999)).rejects.toThrow();

      expect(mockUserRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateLastSynced()', () => {
    it('should update the last synced timestamp', async () => {
      vi.mocked(mockUserRepo.updateLastSynced).mockResolvedValue();

      await service.updateLastSynced(1);

      expect(mockUserRepo.updateLastSynced).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should pass the current date', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      vi.mocked(mockUserRepo.updateLastSynced).mockResolvedValue();

      await service.updateLastSynced(1);

      expect(mockUserRepo.updateLastSynced).toHaveBeenCalledWith(
        1,
        new Date('2024-06-15T12:00:00Z')
      );

      vi.useRealTimers();
    });
  });
});
