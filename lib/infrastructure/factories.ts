import type { IRepositoryFactory, IGameRepository, IUserRepository } from '@/lib/domain/repositories/interfaces';
import { SQLiteGameRepository } from './database/repositories/SQLiteGameRepository';
import { SQLiteUserRepository } from './database/repositories/SQLiteUserRepository';
import { getDatabase } from './database/client';
import { GameService } from '@/lib/domain/services/GameService';
import { UserService } from '@/lib/domain/services/UserService';
import { SyncService } from '@/lib/domain/services/SyncService';
import { ChessComClient } from './api-clients/ChessComClient';
import { LichessClient } from './api-clients/LichessClient';

// ============================================
// REPOSITORY FACTORY
// ============================================

/**
 * SQLite repository factory.
 * To switch to PostgreSQL, create PostgresRepositoryFactory implementing same interface.
 */
export class SQLiteRepositoryFactory implements IRepositoryFactory {
  createGameRepository(): IGameRepository {
    return new SQLiteGameRepository(getDatabase());
  }
  
  createUserRepository(): IUserRepository {
    return new SQLiteUserRepository(getDatabase());
  }
}

// ============================================
// FACTORY SINGLETON
// ============================================

let factory: IRepositoryFactory = new SQLiteRepositoryFactory();

/**
 * Get the current repository factory
 */
export function getRepositoryFactory(): IRepositoryFactory {
  return factory;
}

/**
 * Set the repository factory (for testing or swapping implementations)
 */
export function setRepositoryFactory(f: IRepositoryFactory): void {
  factory = f;
}

// ============================================
// REPOSITORY CONVENIENCE FUNCTIONS
// ============================================

/**
 * Get a game repository instance
 */
export function getGameRepository(): IGameRepository {
  return factory.createGameRepository();
}

/**
 * Get a user repository instance
 */
export function getUserRepository(): IUserRepository {
  return factory.createUserRepository();
}

// ============================================
// SERVICE FACTORIES
// ============================================

/**
 * Create a GameService instance
 */
export function createGameService(): GameService {
  return new GameService(factory.createGameRepository());
}

/**
 * Create a UserService instance
 */
export function createUserService(): UserService {
  return new UserService(factory.createUserRepository());
}

/**
 * Create a SyncService instance
 */
export function createSyncService(): SyncService {
  return new SyncService(
    factory.createGameRepository(),
    factory.createUserRepository(),
    new ChessComClient(),
    new LichessClient(),
  );
}
