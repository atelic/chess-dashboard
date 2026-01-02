/**
 * User domain model.
 * Represents a user profile with authentication and chess platform credentials.
 */
export interface User {
  readonly id: number;
  readonly email: string | null;
  readonly passwordHash: string | null;
  readonly chesscomUsername: string | null;
  readonly lichessUsername: string | null;
  readonly createdAt: Date;
  readonly lastSyncedAt: Date | null;
  readonly resetToken: string | null;
  readonly resetTokenExpiresAt: Date | null;
}

/**
 * Data required to create a new user (legacy - without auth)
 */
export interface CreateUserData {
  chesscomUsername?: string | null;
  lichessUsername?: string | null;
}

/**
 * Data required to create a new user with authentication
 */
export interface CreateUserWithAuthData {
  email: string;
  passwordHash: string;
  chesscomUsername?: string | null;
  lichessUsername?: string | null;
}

/**
 * Data for updating a user
 */
export interface UpdateUserData {
  chesscomUsername?: string | null;
  lichessUsername?: string | null;
}

/**
 * Data for adding auth credentials to an existing legacy user
 */
export interface AddAuthToUserData {
  email: string;
  passwordHash: string;
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a new User object (without ID - assigned by database)
 */
export function createUserData(data: CreateUserData): Omit<User, 'id'> {
  return {
    email: null,
    passwordHash: null,
    chesscomUsername: data.chesscomUsername || null,
    lichessUsername: data.lichessUsername || null,
    createdAt: new Date(),
    lastSyncedAt: null,
    resetToken: null,
    resetTokenExpiresAt: null,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has any chess platform configured
 */
export function hasAnyPlatform(user: User): boolean {
  return Boolean(user.chesscomUsername || user.lichessUsername);
}

/**
 * Check if user has Chess.com configured
 */
export function hasChessCom(user: User): boolean {
  return Boolean(user.chesscomUsername);
}

/**
 * Check if user has Lichess configured
 */
export function hasLichess(user: User): boolean {
  return Boolean(user.lichessUsername);
}

/**
 * Check if user has completed authentication setup
 */
export function hasAuth(user: User): boolean {
  return Boolean(user.email && user.passwordHash);
}

/**
 * Check if user is a legacy user (no auth, just chess usernames)
 */
export function isLegacyUser(user: User): boolean {
  return !user.email && hasAnyPlatform(user);
}

/**
 * Check if user needs onboarding (has auth but no chess accounts)
 */
export function needsOnboarding(user: User): boolean {
  return hasAuth(user) && !hasAnyPlatform(user);
}

/**
 * Get display text for configured platforms
 */
export function getPlatformDisplayText(user: User): string {
  const platforms: string[] = [];
  
  if (user.chesscomUsername) {
    platforms.push(`Chess.com: ${user.chesscomUsername}`);
  }
  if (user.lichessUsername) {
    platforms.push(`Lichess: ${user.lichessUsername}`);
  }
  
  return platforms.join(', ') || 'No platforms configured';
}

/**
 * Format the last synced time for display
 */
export function formatLastSynced(user: User): string {
  if (!user.lastSyncedAt) {
    return 'Never synced';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - user.lastSyncedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}
