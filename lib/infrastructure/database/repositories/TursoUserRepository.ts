import type { IUserRepository } from '@/lib/domain/repositories/interfaces';
import type { User, CreateUserData, UpdateUserData, CreateUserWithAuthData, AddAuthToUserData } from '@/lib/domain/models/User';
import type { TursoClient } from '../client';
import { UserNotFoundError, DatabaseError } from '@/lib/shared/errors';

/**
 * Database row type for users table
 */
interface UserRow {
  id: number;
  email: string | null;
  password_hash: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  created_at: string;
  last_synced_at: string | null;
  reset_token: string | null;
  reset_token_expires_at: string | null;
}

/**
 * Turso implementation of IUserRepository
 */
export class TursoUserRepository implements IUserRepository {
  constructor(private readonly db: TursoClient) {}

  // ============================================
  // QUERIES
  // ============================================

  async findById(id: number): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  async findFirst(): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT * FROM users ORDER BY id ASC LIMIT 1',
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  async exists(): Promise<boolean> {
    const rows = await this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM users',
    );
    return rows[0].count > 0;
  }

  async findLegacyUserByUsername(
    chesscomUsername?: string | null,
    lichessUsername?: string | null,
  ): Promise<User | null> {
    // Find a user that has no email (legacy) but matches one of the chess usernames
    if (!chesscomUsername && !lichessUsername) {
      return null;
    }

    const conditions: string[] = ['email IS NULL'];
    const params: unknown[] = [];

    if (chesscomUsername) {
      conditions.push('LOWER(chesscom_username) = LOWER(?)');
      params.push(chesscomUsername);
    }

    if (lichessUsername) {
      conditions.push('LOWER(lichess_username) = LOWER(?)');
      params.push(lichessUsername);
    }

    // Must match at least one chess username
    const usernameConditions = conditions.slice(1); // Remove 'email IS NULL'
    const sql = `
      SELECT * FROM users 
      WHERE email IS NULL 
        AND (${usernameConditions.join(' OR ')})
      LIMIT 1
    `;

    const rows = await this.db.query<UserRow>(sql, params);

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  async findByResetToken(token: string): Promise<User | null> {
    const rows = await this.db.query<UserRow>(
      `SELECT * FROM users 
       WHERE reset_token = ? 
         AND reset_token_expires_at > datetime('now')`,
      [token],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  async create(data: CreateUserData): Promise<User> {
    const result = await this.db.execute(
      `INSERT INTO users (chesscom_username, lichess_username, created_at)
       VALUES (?, ?, ?)`,
      [
        data.chesscomUsername || null,
        data.lichessUsername || null,
        new Date().toISOString(),
      ],
    );

    const user = await this.findById(result.lastInsertRowid);
    if (!user) {
      throw new DatabaseError('Failed to create user');
    }

    return user;
  }

  async createWithAuth(data: CreateUserWithAuthData): Promise<User> {
    const result = await this.db.execute(
      `INSERT INTO users (email, password_hash, chesscom_username, lichess_username, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.email.toLowerCase(),
        data.passwordHash,
        data.chesscomUsername || null,
        data.lichessUsername || null,
        new Date().toISOString(),
      ],
    );

    const user = await this.findById(result.lastInsertRowid);
    if (!user) {
      throw new DatabaseError('Failed to create user with auth');
    }

    return user;
  }

  async addAuthToUser(userId: number, data: AddAuthToUserData): Promise<User> {
    const result = await this.db.execute(
      `UPDATE users SET email = ?, password_hash = ? WHERE id = ?`,
      [data.email.toLowerCase(), data.passwordHash, userId],
    );

    if (result.changes === 0) {
      throw new UserNotFoundError(userId);
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new DatabaseError('Failed to add auth to user');
    }

    return user;
  }

  async update(id: number, data: UpdateUserData): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new UserNotFoundError(id);
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.chesscomUsername !== undefined) {
      updates.push('chesscom_username = ?');
      params.push(data.chesscomUsername);
    }
    if (data.lichessUsername !== undefined) {
      updates.push('lichess_username = ?');
      params.push(data.lichessUsername);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);
    await this.db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new DatabaseError('Failed to update user');
    }

    return updated;
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    const result = await this.db.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId],
    );

    if (result.changes === 0) {
      throw new UserNotFoundError(userId);
    }
  }

  async setResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    const result = await this.db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?',
      [token, expiresAt.toISOString(), userId],
    );

    if (result.changes === 0) {
      throw new UserNotFoundError(userId);
    }
  }

  async clearResetToken(userId: number): Promise<void> {
    const result = await this.db.execute(
      'UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
      [userId],
    );

    if (result.changes === 0) {
      throw new UserNotFoundError(userId);
    }
  }

  async updateLastSynced(userId: number, date: Date): Promise<void> {
    const result = await this.db.execute(
      'UPDATE users SET last_synced_at = ? WHERE id = ?',
      [date.toISOString(), userId],
    );

    if (result.changes === 0) {
      throw new UserNotFoundError(userId);
    }
  }

  async delete(userId: number): Promise<void> {
    // Games will be cascade deleted due to foreign key
    await this.db.execute('DELETE FROM users WHERE id = ?', [userId]);
  }

  // ============================================
  // HELPERS
  // ============================================

  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      chesscomUsername: row.chesscom_username,
      lichessUsername: row.lichess_username,
      createdAt: new Date(row.created_at),
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
      resetToken: row.reset_token,
      resetTokenExpiresAt: row.reset_token_expires_at ? new Date(row.reset_token_expires_at) : null,
    };
  }
}
