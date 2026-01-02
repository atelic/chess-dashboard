import bcrypt from 'bcryptjs';
import type { IUserRepository } from '../repositories/interfaces';
import type { User, CreateUserData, UpdateUserData } from '../models/User';
import { 
  UserNotFoundError, 
  ValidationError,
  EmailExistsError,
  AuthenticationError,
  InvalidResetTokenError,
  PasswordMismatchError,
} from '@/lib/shared/errors';

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 24;

/**
 * User service for managing user profiles and authentication
 */
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Register a new user with email and password
   * If matching chess username exists (legacy user), migrate that user
   */
  async registerUser(data: {
    email: string;
    password: string;
    chesscomUsername?: string | null;
    lichessUsername?: string | null;
  }): Promise<User> {
    // Validate email format
    if (!this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    // Check if email already exists
    const existingByEmail = await this.userRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw new EmailExistsError();
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Check for legacy user to migrate
    if (data.chesscomUsername || data.lichessUsername) {
      const legacyUser = await this.userRepository.findLegacyUserByUsername(
        data.chesscomUsername,
        data.lichessUsername,
      );

      if (legacyUser) {
        // Migrate: add auth to existing legacy user
        return this.userRepository.addAuthToUser(legacyUser.id, {
          email: data.email,
          passwordHash,
        });
      }
    }

    // Create new user with auth
    return this.userRepository.createWithAuth({
      email: data.email,
      passwordHash,
      chesscomUsername: data.chesscomUsername,
      lichessUsername: data.lichessUsername,
    });
  }

  /**
   * Verify user credentials and return user if valid
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user || !user.passwordHash) {
      throw new AuthenticationError();
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError();
    }

    return user;
  }

  /**
   * Request a password reset - generates token
   * Returns the token (in production, send via email)
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const user = await this.userRepository.findByEmail(email);
    
    // Don't reveal if email exists
    if (!user) {
      return null;
    }

    // Generate secure reset token using Web Crypto API
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    await this.userRepository.setResetToken(user.id, token, expiresAt);

    return token;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByResetToken(token);
    
    if (!user) {
      throw new InvalidResetTokenError();
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.updatePassword(user.id, passwordHash);
    await this.userRepository.clearResetToken(user.id);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user || !user.passwordHash) {
      throw new UserNotFoundError(userId);
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new PasswordMismatchError();
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.updatePassword(userId, passwordHash);
  }

  // ============================================
  // USER QUERY METHODS
  // ============================================

  /**
   * Get the current user (legacy single-user mode)
   * @deprecated Use getUserById with session user ID instead
   */
  async getCurrentUser(): Promise<User | null> {
    return this.userRepository.findFirst();
  }

  /**
   * Get a user by ID
   */
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Check if a user exists
   */
  async hasUser(): Promise<boolean> {
    return this.userRepository.exists();
  }

  // ============================================
  // USER MUTATION METHODS
  // ============================================

  /**
   * Create a new user profile (legacy - without auth)
   * @deprecated Use registerUser for new users
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Validate that at least one platform is provided
    if (!data.chesscomUsername && !data.lichessUsername) {
      throw new ValidationError('At least one chess platform username is required');
    }

    return this.userRepository.create(data);
  }

  /**
   * Update user's chess usernames
   */
  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    // Ensure user exists
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new UserNotFoundError(id);
    }

    // Validate that at least one platform remains after update
    const newChesscom = data.chesscomUsername !== undefined 
      ? data.chesscomUsername 
      : existing.chesscomUsername;
    const newLichess = data.lichessUsername !== undefined 
      ? data.lichessUsername 
      : existing.lichessUsername;

    if (!newChesscom && !newLichess) {
      throw new ValidationError('At least one chess platform username is required');
    }

    return this.userRepository.update(id, data);
  }

  /**
   * Delete user and all associated data
   */
  async deleteUser(id: number): Promise<void> {
    const exists = await this.userRepository.findById(id);
    if (!exists) {
      throw new UserNotFoundError(id);
    }

    await this.userRepository.delete(id);
  }

  /**
   * Update the last synced timestamp
   */
  async updateLastSynced(userId: number): Promise<void> {
    await this.userRepository.updateLastSynced(userId, new Date());
  }

  // ============================================
  // HELPERS
  // ============================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
