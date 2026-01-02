import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { UserService } from '@/lib/domain/services/UserService';
import type { IUserRepository } from '@/lib/domain/repositories/interfaces';
import { 
  UserNotFoundError, 
  ValidationError,
  EmailExistsError,
  AuthenticationError,
  InvalidResetTokenError,
  PasswordMismatchError,
} from '@/lib/shared/errors';
import { 
  createTestUser, 
  createChessComOnlyUser,
  createAuthenticatedUser,
  createLegacyUser,
  createUserWithResetToken,
} from '@/__tests__/fixtures/user';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('UserService', () => {
  // Mock repository
  const mockUserRepo: IUserRepository = {
    findFirst: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findLegacyUserByUsername: vi.fn(),
    findByResetToken: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    createWithAuth: vi.fn(),
    addAuthToUser: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
    setResetToken: vi.fn(),
    clearResetToken: vi.fn(),
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

    it('should allow creating multiple users (multi-user mode)', async () => {
      const newUser = createChessComOnlyUser({ id: 2 });
      vi.mocked(mockUserRepo.exists).mockResolvedValue(true);
      vi.mocked(mockUserRepo.create).mockResolvedValue(newUser);

      // Should NOT throw even when user exists (multi-user mode)
      const result = await service.createUser({ chesscomUsername: 'testuser' });

      expect(result).toEqual(newUser);
      expect(mockUserRepo.create).toHaveBeenCalled();
    });

    it('should not call create when validation fails', async () => {
      await expect(service.createUser({})).rejects.toThrow();

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

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  describe('registerUser()', () => {
    beforeEach(() => {
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$10$hashedpassword' as never);
    });

    it('should register a new user with email and password', async () => {
      const newUser = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepo.findLegacyUserByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepo.createWithAuth).mockResolvedValue(newUser);

      const result = await service.registerUser({
        email: 'test@example.com',
        password: 'password123',
        chesscomUsername: 'testuser',
      });

      expect(result).toEqual(newUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepo.createWithAuth).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedpassword',
        chesscomUsername: 'testuser',
        lichessUsername: undefined,
      });
    });

    it('should throw ValidationError for invalid email format', async () => {
      await expect(
        service.registerUser({
          email: 'invalid-email',
          password: 'password123',
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.registerUser({
          email: 'invalid-email',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw EmailExistsError when email already exists', async () => {
      const existingUser = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existingUser);

      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(EmailExistsError);
    });

    it('should migrate legacy user when chess username matches', async () => {
      const legacyUser = createLegacyUser({ id: 5 });
      const migratedUser = createAuthenticatedUser({ id: 5 });
      
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepo.findLegacyUserByUsername).mockResolvedValue(legacyUser);
      vi.mocked(mockUserRepo.addAuthToUser).mockResolvedValue(migratedUser);

      const result = await service.registerUser({
        email: 'test@example.com',
        password: 'password123',
        chesscomUsername: 'testuser',
      });

      expect(result).toEqual(migratedUser);
      expect(mockUserRepo.addAuthToUser).toHaveBeenCalledWith(5, {
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedpassword',
      });
      expect(mockUserRepo.createWithAuth).not.toHaveBeenCalled();
    });

    it('should create new user when no legacy user matches', async () => {
      const newUser = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepo.findLegacyUserByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepo.createWithAuth).mockResolvedValue(newUser);

      await service.registerUser({
        email: 'test@example.com',
        password: 'password123',
        chesscomUsername: 'testuser',
      });

      expect(mockUserRepo.createWithAuth).toHaveBeenCalled();
      expect(mockUserRepo.addAuthToUser).not.toHaveBeenCalled();
    });

    it('should register user without chess usernames', async () => {
      const newUser = createAuthenticatedUser({ chesscomUsername: null, lichessUsername: null });
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepo.createWithAuth).mockResolvedValue(newUser);

      const result = await service.registerUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(newUser);
      // Should not check for legacy users when no chess username provided
      expect(mockUserRepo.findLegacyUserByUsername).not.toHaveBeenCalled();
    });
  });

  describe('verifyCredentials()', () => {
    it('should return user when credentials are valid', async () => {
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.verifyCredentials('test@example.com', 'password123');

      expect(result).toEqual(user);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', user.passwordHash);
    });

    it('should throw AuthenticationError when user not found', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      await expect(
        service.verifyCredentials('nonexistent@example.com', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError when user has no password hash', async () => {
      const legacyUser = createLegacyUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(legacyUser);

      await expect(
        service.verifyCredentials('test@example.com', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError when password is incorrect', async () => {
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.verifyCredentials('test@example.com', 'wrongpassword')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('requestPasswordReset()', () => {
    it('should generate and store reset token for valid email', async () => {
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(mockUserRepo.setResetToken).mockResolvedValue();

      const token = await service.requestPasswordReset('test@example.com');

      expect(token).toBeTruthy();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(mockUserRepo.setResetToken).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        expect.any(Date)
      );
    });

    it('should return null when email not found (security)', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const token = await service.requestPasswordReset('nonexistent@example.com');

      expect(token).toBeNull();
      expect(mockUserRepo.setResetToken).not.toHaveBeenCalled();
    });

    it('should set token expiry to 24 hours from now', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);
      vi.mocked(mockUserRepo.setResetToken).mockResolvedValue();

      await service.requestPasswordReset('test@example.com');

      expect(mockUserRepo.setResetToken).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        new Date('2024-06-16T12:00:00Z') // 24 hours later
      );

      vi.useRealTimers();
    });
  });

  describe('resetPassword()', () => {
    beforeEach(() => {
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$10$newhashedpassword' as never);
    });

    it('should reset password with valid token', async () => {
      const user = createUserWithResetToken();
      vi.mocked(mockUserRepo.findByResetToken).mockResolvedValue(user);
      vi.mocked(mockUserRepo.updatePassword).mockResolvedValue();
      vi.mocked(mockUserRepo.clearResetToken).mockResolvedValue();

      await service.resetPassword('valid-reset-token-123', 'newpassword456');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword456', 10);
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(
        user.id,
        '$2a$10$newhashedpassword'
      );
      expect(mockUserRepo.clearResetToken).toHaveBeenCalledWith(user.id);
    });

    it('should throw InvalidResetTokenError for invalid token', async () => {
      vi.mocked(mockUserRepo.findByResetToken).mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newpassword456')
      ).rejects.toThrow(InvalidResetTokenError);

      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
      expect(mockUserRepo.clearResetToken).not.toHaveBeenCalled();
    });
  });

  describe('changePassword()', () => {
    beforeEach(() => {
      vi.mocked(bcrypt.hash).mockResolvedValue('$2a$10$newhashedpassword' as never);
    });

    it('should change password when current password is correct', async () => {
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(mockUserRepo.updatePassword).mockResolvedValue();

      await service.changePassword(user.id, 'currentpassword', 'newpassword456');

      expect(bcrypt.compare).toHaveBeenCalledWith('currentpassword', user.passwordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword456', 10);
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(
        user.id,
        '$2a$10$newhashedpassword'
      );
    });

    it('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await expect(
        service.changePassword(999, 'currentpassword', 'newpassword456')
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw UserNotFoundError when user has no password hash', async () => {
      const legacyUser = createLegacyUser();
      vi.mocked(mockUserRepo.findById).mockResolvedValue(legacyUser);

      await expect(
        service.changePassword(legacyUser.id, 'currentpassword', 'newpassword456')
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw PasswordMismatchError when current password is incorrect', async () => {
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findById).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.changePassword(user.id, 'wrongpassword', 'newpassword456')
      ).rejects.toThrow(PasswordMismatchError);

      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('getUserByEmail()', () => {
    it('should return user when found', async () => {
      const user = createAuthenticatedUser();
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user);

      const result = await service.getUserByEmail('test@example.com');

      expect(result).toEqual(user);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });
});
