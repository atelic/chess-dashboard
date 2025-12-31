import type { IUserRepository } from '@/lib/domain/repositories/interfaces';
import type { User, CreateUserData, UpdateUserData } from '@/lib/domain/models/User';
import type { SQLiteClient } from '../client';
import { UserNotFoundError, DatabaseError } from '@/lib/shared/errors';

/**
 * SQLite row type for users table
 */
interface UserRow {
  id: number;
  chesscom_username: string | null;
  lichess_username: string | null;
  created_at: string;
  last_synced_at: string | null;
}

/**
 * SQLite implementation of IUserRepository
 */
export class SQLiteUserRepository implements IUserRepository {
  constructor(private readonly db: SQLiteClient) {}

  // ============================================
  // QUERIES
  // ============================================

  async findById(id: number): Promise<User | null> {
    const rows = this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  async findFirst(): Promise<User | null> {
    const rows = this.db.query<UserRow>(
      'SELECT * FROM users ORDER BY id ASC LIMIT 1',
    );

    if (rows.length === 0) {
      return null;
    }

    return this.rowToUser(rows[0]);
  }

  async exists(): Promise<boolean> {
    const rows = this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM users',
    );
    return rows[0].count > 0;
  }

  // ============================================
  // MUTATIONS
  // ============================================

  async create(data: CreateUserData): Promise<User> {
    const result = this.db.execute(
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
    this.db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new DatabaseError('Failed to update user');
    }

    return updated;
  }

  async updateLastSynced(userId: number, date: Date): Promise<void> {
    const result = this.db.execute(
      'UPDATE users SET last_synced_at = ? WHERE id = ?',
      [date.toISOString(), userId],
    );

    if (result.changes === 0) {
      throw new UserNotFoundError(userId);
    }
  }

  async delete(userId: number): Promise<void> {
    // Games will be cascade deleted due to foreign key
    this.db.execute('DELETE FROM users WHERE id = ?', [userId]);
  }

  // ============================================
  // HELPERS
  // ============================================

  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      chesscomUsername: row.chesscom_username,
      lichessUsername: row.lichess_username,
      createdAt: new Date(row.created_at),
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
    };
  }
}
