import type { User } from '@/lib/domain/models/User';

/**
 * Create a test user with sensible defaults
 */
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: null,
    passwordHash: null,
    chesscomUsername: 'testuser',
    lichessUsername: 'testuser',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastSyncedAt: new Date('2024-06-15T10:00:00Z'),
    resetToken: null,
    resetTokenExpiresAt: null,
    ...overrides,
  };
}

/**
 * Create a user with only Chess.com configured
 */
export function createChessComOnlyUser(overrides?: Partial<User>): User {
  return createTestUser({
    chesscomUsername: 'chesscomuser',
    lichessUsername: null,
    ...overrides,
  });
}

/**
 * Create a user with only Lichess configured
 */
export function createLichessOnlyUser(overrides?: Partial<User>): User {
  return createTestUser({
    chesscomUsername: null,
    lichessUsername: 'lichessuser',
    ...overrides,
  });
}

/**
 * Create a user with both platforms configured
 */
export function createDualPlatformUser(overrides?: Partial<User>): User {
  return createTestUser({
    chesscomUsername: 'chesscomuser',
    lichessUsername: 'lichessuser',
    ...overrides,
  });
}

/**
 * Create a user who has never synced
 */
export function createNeverSyncedUser(overrides?: Partial<User>): User {
  return createTestUser({
    lastSyncedAt: null,
    ...overrides,
  });
}

/**
 * Create a user with no platforms configured (invalid state, but useful for testing)
 */
export function createNoPlatformUser(overrides?: Partial<User>): User {
  return createTestUser({
    chesscomUsername: null,
    lichessUsername: null,
    ...overrides,
  });
}

/**
 * Create a user with authentication (email/password)
 */
export function createAuthenticatedUser(overrides?: Partial<User>): User {
  return createTestUser({
    email: 'test@example.com',
    passwordHash: '$2a$10$hashedpassword', // bcrypt hash placeholder
    ...overrides,
  });
}

/**
 * Create a legacy user (no auth, chess usernames only)
 */
export function createLegacyUser(overrides?: Partial<User>): User {
  return createTestUser({
    email: null,
    passwordHash: null,
    ...overrides,
  });
}

/**
 * Create a user with a reset token
 */
export function createUserWithResetToken(overrides?: Partial<User>): User {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 24);
  
  return createAuthenticatedUser({
    resetToken: 'valid-reset-token-123',
    resetTokenExpiresAt: futureDate,
    ...overrides,
  });
}

/**
 * Create a user with an expired reset token
 */
export function createUserWithExpiredResetToken(overrides?: Partial<User>): User {
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - 1);
  
  return createAuthenticatedUser({
    resetToken: 'expired-reset-token',
    resetTokenExpiresAt: pastDate,
    ...overrides,
  });
}
