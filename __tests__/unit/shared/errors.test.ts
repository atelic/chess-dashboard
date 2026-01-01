import { describe, it, expect } from 'vitest';
import {
  AppError,
  UserNotFoundError,
  UserExistsError,
  GameNotFoundError,
  SyncError,
  RateLimitError,
  ExternalApiError,
  InvalidUsernameError,
  DatabaseError,
  ValidationError,
} from '@/lib/shared/errors';

describe('Error classes', () => {
  describe('AppError', () => {
    it('should create error with message, code, and statusCode', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should default to 500 status code', () => {
      const error = new AppError('Test error', 'TEST_ERROR');

      expect(error.statusCode).toBe(500);
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400);
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
      });
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test', 'TEST');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('UserNotFoundError', () => {
    it('should include userId in message', () => {
      const error = new UserNotFoundError(42);

      expect(error.message).toBe('User 42 not found');
    });

    it('should have correct code and status', () => {
      const error = new UserNotFoundError(1);

      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should have correct name', () => {
      const error = new UserNotFoundError(1);

      expect(error.name).toBe('UserNotFoundError');
    });
  });

  describe('UserExistsError', () => {
    it('should have default message', () => {
      const error = new UserExistsError();

      expect(error.message).toBe('User already exists');
    });

    it('should have correct code and status', () => {
      const error = new UserExistsError();

      expect(error.code).toBe('USER_EXISTS');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('GameNotFoundError', () => {
    it('should include gameId in message', () => {
      const error = new GameNotFoundError('game-123');

      expect(error.message).toBe('Game game-123 not found');
    });

    it('should have correct code and status', () => {
      const error = new GameNotFoundError('test');

      expect(error.code).toBe('GAME_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('SyncError', () => {
    it('should have custom message', () => {
      const error = new SyncError('Sync failed');

      expect(error.message).toBe('Sync failed');
    });

    it('should have correct code and status', () => {
      const error = new SyncError('test');

      expect(error.code).toBe('SYNC_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('should optionally include source', () => {
      const error = new SyncError('Sync failed', 'chesscom');

      expect(error.source).toBe('chesscom');
    });
  });

  describe('RateLimitError', () => {
    it('should include source in message', () => {
      const error = new RateLimitError('Chess.com');

      expect(error.message).toBe('Rate limited by Chess.com');
    });

    it('should have correct code and status', () => {
      const error = new RateLimitError('test');

      expect(error.code).toBe('RATE_LIMIT');
      expect(error.statusCode).toBe(429);
    });

    it('should optionally include retryAfter', () => {
      const error = new RateLimitError('Chess.com', 60);

      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ExternalApiError', () => {
    it('should include source in message', () => {
      const error = new ExternalApiError('Lichess');

      expect(error.message).toContain('Lichess');
    });

    it('should include original error message if provided', () => {
      const originalError = new Error('Network timeout');
      const error = new ExternalApiError('Lichess', originalError);

      expect(error.message).toContain('Network timeout');
      expect(error.originalError).toBe(originalError);
    });

    it('should have correct code and status', () => {
      const error = new ExternalApiError('test');

      expect(error.code).toBe('EXTERNAL_API_ERROR');
      expect(error.statusCode).toBe(502);
    });
  });

  describe('InvalidUsernameError', () => {
    it('should include source and username in message', () => {
      const error = new InvalidUsernameError('Chess.com', 'baduser');

      expect(error.message).toBe('Invalid Chess.com username: baduser');
    });

    it('should have correct code and status', () => {
      const error = new InvalidUsernameError('test', 'user');

      expect(error.code).toBe('INVALID_USERNAME');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('DatabaseError', () => {
    it('should have custom message', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
    });

    it('should have correct code and status', () => {
      const error = new DatabaseError('test');

      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('should optionally include original error', () => {
      const originalError = new Error('SQLITE_ERROR');
      const error = new DatabaseError('Query failed', originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('ValidationError', () => {
    it('should have custom message', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
    });

    it('should have correct code and status', () => {
      const error = new ValidationError('test');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should optionally include field name', () => {
      const error = new ValidationError('Invalid email', 'email');

      expect(error.field).toBe('email');
    });
  });
});
