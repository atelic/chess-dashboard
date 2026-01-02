import type { ISessionRepository } from '@/lib/domain/repositories/interfaces';
import type { TursoClient } from '../client';

/**
 * Database row type for sessions table
 */
interface SessionRow {
  session_token: string;
  user_id: number;
  expires_at: string;
}

/**
 * Turso implementation of ISessionRepository
 */
export class TursoSessionRepository implements ISessionRepository {
  constructor(private readonly db: TursoClient) {}

  async findByToken(sessionToken: string): Promise<{ userId: number; expiresAt: Date } | null> {
    const rows = await this.db.query<SessionRow>(
      'SELECT * FROM sessions WHERE session_token = ?',
      [sessionToken],
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      userId: row.user_id,
      expiresAt: new Date(row.expires_at),
    };
  }

  async create(sessionToken: string, userId: number, expiresAt: Date): Promise<void> {
    await this.db.execute(
      `INSERT INTO sessions (session_token, user_id, expires_at)
       VALUES (?, ?, ?)`,
      [sessionToken, userId, expiresAt.toISOString()],
    );
  }

  async updateExpiration(sessionToken: string, expiresAt: Date): Promise<void> {
    await this.db.execute(
      'UPDATE sessions SET expires_at = ? WHERE session_token = ?',
      [expiresAt.toISOString(), sessionToken],
    );
  }

  async delete(sessionToken: string): Promise<void> {
    await this.db.execute(
      'DELETE FROM sessions WHERE session_token = ?',
      [sessionToken],
    );
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.db.execute(
      'DELETE FROM sessions WHERE user_id = ?',
      [userId],
    );
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.execute(
      "DELETE FROM sessions WHERE expires_at < datetime('now')",
    );
    return result.changes;
  }
}
