import type { IUserRepository } from '../repositories/interfaces';
import type { User, CreateUserData, UpdateUserData } from '../models/User';
import { UserNotFoundError, UserExistsError, ValidationError } from '@/lib/shared/errors';

/**
 * User service for managing user profiles
 */
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Get the current user (single-user mode)
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
   * Check if a user exists
   */
  async hasUser(): Promise<boolean> {
    return this.userRepository.exists();
  }

  /**
   * Create a new user profile
   * In single-user mode, this will fail if a user already exists
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Validate that at least one platform is provided
    if (!data.chesscomUsername && !data.lichessUsername) {
      throw new ValidationError('At least one chess platform username is required');
    }

    // Check if user already exists (single-user mode)
    const exists = await this.userRepository.exists();
    if (exists) {
      throw new UserExistsError();
    }

    return this.userRepository.create(data);
  }

  /**
   * Update user profile
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
}
