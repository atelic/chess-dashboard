import type { Game, GameSource, PlayerColor, AnalysisData } from '@/lib/domain/models/Game';
import type { User, CreateUserData, UpdateUserData, CreateUserWithAuthData, AddAuthToUserData } from '@/lib/domain/models/User';
import type { GameFilter } from '@/lib/domain/models/GameFilter';

/**
 * Abstract interface for game data access.
 * Implementations: SQLiteGameRepository, PostgresGameRepository, etc.
 */
export interface IGameRepository {
  // ============================================
  // QUERIES
  // ============================================
  
  /**
   * Find all games for a user, optionally filtered
   */
  findAll(userId: number, filter?: GameFilter): Promise<Game[]>;
  
  /**
   * Find a single game by ID
   */
  findById(id: string): Promise<Game | null>;
  
  /**
   * Find multiple games by IDs
   */
  findByIds(ids: string[]): Promise<Game[]>;
  
  /**
   * Find games by ECO code and optionally color/result
   */
  findByEco(userId: number, eco: string, color?: PlayerColor): Promise<Game[]>;
  
  /**
   * Find games against a specific opponent
   */
  findByOpponent(userId: number, opponent: string): Promise<Game[]>;
  
  /**
   * Count games for a user, optionally filtered
   */
  count(userId: number, filter?: GameFilter): Promise<number>;
  
  /**
   * Check if a game exists by ID
   */
  existsById(id: string): Promise<boolean>;
  
  /**
   * Get the most recent game date for a user/source (for incremental sync)
   */
  getLatestGameDate(userId: number, source: GameSource): Promise<Date | null>;

  /**
   * Find games that don't have analysis data yet
   */
  findGamesNeedingAnalysis(userId: number, limit?: number): Promise<Game[]>;
  
  // ============================================
  // MUTATIONS
  // ============================================
  
  /**
   * Save a single game
   */
  save(game: Game & { userId: number }): Promise<void>;
  
  /**
   * Save multiple games (bulk insert)
   * Returns the count of games saved
   */
  saveMany(games: (Game & { userId: number })[]): Promise<number>;
  
  /**
   * Delete all games for a user
   * Returns the count of games deleted
   */
  deleteByUser(userId: number): Promise<number>;

  /**
   * Update analysis data for a game
   */
  updateAnalysis(gameId: string, analysis: AnalysisData): Promise<void>;
}

/**
 * Abstract interface for user data access.
 */
export interface IUserRepository {
  // ============================================
  // QUERIES
  // ============================================
  
  /**
   * Find a user by ID
   */
  findById(id: number): Promise<User | null>;
  
  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;
  
  /**
   * Find the first user (for simple single-user mode - legacy)
   */
  findFirst(): Promise<User | null>;
  
  /**
   * Check if any user exists
   */
  exists(): Promise<boolean>;

  /**
   * Find a legacy user by chess username (for migration)
   * Returns user if found with matching username and no email set
   */
  findLegacyUserByUsername(
    chesscomUsername?: string | null,
    lichessUsername?: string | null,
  ): Promise<User | null>;

  /**
   * Find user by password reset token
   */
  findByResetToken(token: string): Promise<User | null>;
  
  // ============================================
  // MUTATIONS
  // ============================================
  
  /**
   * Create a new user (legacy - without auth)
   * Returns the created user with ID
   */
  create(data: CreateUserData): Promise<User>;

  /**
   * Create a new user with authentication
   */
  createWithAuth(data: CreateUserWithAuthData): Promise<User>;

  /**
   * Add authentication to an existing legacy user
   */
  addAuthToUser(userId: number, data: AddAuthToUserData): Promise<User>;
  
  /**
   * Update an existing user's chess usernames
   */
  update(id: number, data: UpdateUserData): Promise<User>;

  /**
   * Update user's password hash
   */
  updatePassword(userId: number, passwordHash: string): Promise<void>;

  /**
   * Set password reset token
   */
  setResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;

  /**
   * Clear password reset token
   */
  clearResetToken(userId: number): Promise<void>;
  
  /**
   * Update the last synced timestamp
   */
  updateLastSynced(userId: number, date: Date): Promise<void>;
  
  /**
   * Delete a user and all their data
   */
  delete(userId: number): Promise<void>;
}

/**
 * Abstract interface for session data access.
 */
export interface ISessionRepository {
  /**
   * Find a session by token
   */
  findByToken(sessionToken: string): Promise<{ userId: number; expiresAt: Date } | null>;

  /**
   * Create a new session
   */
  create(sessionToken: string, userId: number, expiresAt: Date): Promise<void>;

  /**
   * Update session expiration
   */
  updateExpiration(sessionToken: string, expiresAt: Date): Promise<void>;

  /**
   * Delete a session
   */
  delete(sessionToken: string): Promise<void>;

  /**
   * Delete all sessions for a user
   */
  deleteByUser(userId: number): Promise<void>;

  /**
   * Delete expired sessions
   */
  deleteExpired(): Promise<number>;
}

/**
 * Database client interface for abstraction
 */
export interface IDatabaseClient {
  /**
   * Execute a query and return results
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  
  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>;
  
  /**
   * Execute multiple statements as an atomic batch
   */
  batch(statements: { sql: string; params?: unknown[] }[]): Promise<void>;
  
  /**
   * Execute raw SQL (for migrations)
   */
  exec(sql: string): Promise<void>;
  
  /**
   * Close the database connection
   */
  close(): void;
}

/**
 * Factory interface for creating repositories.
 * Allows swapping entire database implementations.
 */
export interface IRepositoryFactory {
  createGameRepository(): Promise<IGameRepository>;
  createUserRepository(): Promise<IUserRepository>;
  createSessionRepository(): Promise<ISessionRepository>;
}
