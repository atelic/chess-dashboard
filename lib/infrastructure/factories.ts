import type { IRepositoryFactory, IGameRepository, IUserRepository, ISessionRepository } from '@/lib/domain/repositories/interfaces';
import { TursoGameRepository } from './database/repositories/TursoGameRepository';
import { TursoUserRepository } from './database/repositories/TursoUserRepository';
import { TursoSessionRepository } from './database/repositories/TursoSessionRepository';
import { getDatabase, TursoClient } from './database/client';
import { GameService } from '@/lib/domain/services/GameService';
import { UserService } from '@/lib/domain/services/UserService';
import { SyncService } from '@/lib/domain/services/SyncService';
import { ChessComClient } from './api-clients/ChessComClient';
import { LichessClient } from './api-clients/LichessClient';

// ============================================
// REPOSITORY FACTORY
// ============================================

/**
 * Turso repository factory.
 * To switch databases, create a new factory implementing IRepositoryFactory.
 */
export class TursoRepositoryFactory implements IRepositoryFactory {
  private db: TursoClient | null = null;
  
  async getDb(): Promise<TursoClient> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }
  
  async createGameRepository(): Promise<IGameRepository> {
    return new TursoGameRepository(await this.getDb());
  }
  
  async createUserRepository(): Promise<IUserRepository> {
    return new TursoUserRepository(await this.getDb());
  }

  async createSessionRepository(): Promise<ISessionRepository> {
    return new TursoSessionRepository(await this.getDb());
  }
}

// ============================================
// FACTORY SINGLETON
// ============================================

const factory = new TursoRepositoryFactory();

/**
 * Get the current repository factory
 */
export function getRepositoryFactory(): TursoRepositoryFactory {
  return factory;
}

// ============================================
// REPOSITORY CONVENIENCE FUNCTIONS
// ============================================

/**
 * Get a game repository instance
 */
export async function getGameRepository(): Promise<IGameRepository> {
  return factory.createGameRepository();
}

/**
 * Get a user repository instance
 */
export async function getUserRepository(): Promise<IUserRepository> {
  return factory.createUserRepository();
}

/**
 * Get a session repository instance
 */
export async function getSessionRepository(): Promise<ISessionRepository> {
  return factory.createSessionRepository();
}

// ============================================
// SERVICE FACTORIES
// ============================================

/**
 * Create a GameService instance
 */
export async function createGameService(): Promise<GameService> {
  return new GameService(await factory.createGameRepository());
}

/**
 * Create a UserService instance
 */
export async function createUserService(): Promise<UserService> {
  return new UserService(await factory.createUserRepository());
}

/**
 * Create a SyncService instance
 */
export async function createSyncService(): Promise<SyncService> {
  return new SyncService(
    await factory.createGameRepository(),
    await factory.createUserRepository(),
    new ChessComClient(),
    new LichessClient(),
  );
}
