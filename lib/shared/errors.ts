/**
 * Base application error class.
 * All custom errors should extend this.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace in V8
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * User not found in database
 */
export class UserNotFoundError extends AppError {
  constructor(userId: number) {
    super(`User ${userId} not found`, 'USER_NOT_FOUND', 404);
    this.name = 'UserNotFoundError';
  }
}

/**
 * User already exists (during creation)
 */
export class UserExistsError extends AppError {
  constructor() {
    super('User already exists', 'USER_EXISTS', 409);
    this.name = 'UserExistsError';
  }
}

/**
 * Game not found in database
 */
export class GameNotFoundError extends AppError {
  constructor(gameId: string) {
    super(`Game ${gameId} not found`, 'GAME_NOT_FOUND', 404);
    this.name = 'GameNotFoundError';
  }
}

/**
 * Error during sync operation
 */
export class SyncError extends AppError {
  constructor(
    message: string,
    public readonly source?: string,
  ) {
    super(message, 'SYNC_ERROR', 500);
    this.name = 'SyncError';
  }
}

/**
 * Rate limited by external API
 */
export class RateLimitError extends AppError {
  constructor(
    source: string,
    public readonly retryAfter?: number,
  ) {
    super(`Rate limited by ${source}`, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * External API error (Chess.com, Lichess)
 */
export class ExternalApiError extends AppError {
  constructor(
    source: string,
    public readonly originalError?: Error,
  ) {
    super(
      `Error fetching from ${source}: ${originalError?.message || 'Unknown error'}`,
      'EXTERNAL_API_ERROR',
      502,
    );
    this.name = 'ExternalApiError';
  }
}

/**
 * Invalid username provided
 */
export class InvalidUsernameError extends AppError {
  constructor(source: string, username: string) {
    super(`Invalid ${source} username: ${username}`, 'INVALID_USERNAME', 400);
    this.name = 'InvalidUsernameError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// ============================================
// AUTHENTICATION ERRORS
// ============================================

/**
 * Authentication failed (invalid credentials)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * User not authenticated (no session)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Email already registered
 */
export class EmailExistsError extends AppError {
  constructor() {
    super('Email already registered', 'EMAIL_EXISTS', 409);
    this.name = 'EmailExistsError';
  }
}

/**
 * Invalid or expired password reset token
 */
export class InvalidResetTokenError extends AppError {
  constructor() {
    super('Invalid or expired reset token', 'INVALID_RESET_TOKEN', 400);
    this.name = 'InvalidResetTokenError';
  }
}

/**
 * Password mismatch (for change password)
 */
export class PasswordMismatchError extends AppError {
  constructor() {
    super('Current password is incorrect', 'PASSWORD_MISMATCH', 400);
    this.name = 'PasswordMismatchError';
  }
}
