import { ValidationError } from './errors';

// ============================================
// TYPE VALIDATORS
// ============================================

/**
 * Validate and return a player color
 */
export function validatePlayerColor(color: string | null | undefined): 'white' | 'black' {
  if (color !== 'white' && color !== 'black') {
    throw new ValidationError('Invalid player color. Must be "white" or "black"', 'playerColor');
  }
  return color;
}

/**
 * Validate and return a game source
 */
export function validateSource(source: string | null | undefined): 'lichess' | 'chesscom' {
  if (source !== 'lichess' && source !== 'chesscom') {
    throw new ValidationError('Invalid source. Must be "lichess" or "chesscom"', 'source');
  }
  return source;
}

/**
 * Validate and return a game result
 */
export function validateResult(result: string | null | undefined): 'win' | 'loss' | 'draw' {
  if (result !== 'win' && result !== 'loss' && result !== 'draw') {
    throw new ValidationError('Invalid result. Must be "win", "loss", or "draw"', 'result');
  }
  return result;
}

/**
 * Validate and return a time class
 */
export function validateTimeClass(
  timeClass: string | null | undefined
): 'bullet' | 'blitz' | 'rapid' | 'classical' {
  if (
    timeClass !== 'bullet' &&
    timeClass !== 'blitz' &&
    timeClass !== 'rapid' &&
    timeClass !== 'classical'
  ) {
    throw new ValidationError(
      'Invalid time class. Must be "bullet", "blitz", "rapid", or "classical"',
      'timeClass'
    );
  }
  return timeClass;
}

// ============================================
// STRING VALIDATORS
// ============================================

/**
 * Validate a chess platform username
 * - Must be 1-50 characters
 * - Only alphanumeric, underscore, hyphen allowed
 */
export function validateUsername(username: string | null | undefined, field = 'username'): string {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required', field);
  }

  const trimmed = username.trim();

  if (trimmed.length < 1 || trimmed.length > 50) {
    throw new ValidationError('Username must be between 1 and 50 characters', field);
  }

  // Only allow alphanumeric, underscore, hyphen (standard for chess platforms)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError(
      'Username can only contain letters, numbers, underscores, and hyphens',
      field
    );
  }

  return trimmed;
}

/**
 * Validate an optional username (can be null/empty)
 */
export function validateOptionalUsername(
  username: string | null | undefined,
  field = 'username'
): string | null {
  if (!username || username.trim() === '') {
    return null;
  }
  return validateUsername(username, field);
}

/**
 * Validate a game ID
 * - Must be a non-empty string
 * - Max 100 characters (reasonable for any platform)
 */
export function validateGameId(gameId: string | null | undefined): string {
  if (!gameId || typeof gameId !== 'string') {
    throw new ValidationError('Game ID is required', 'gameId');
  }

  const trimmed = gameId.trim();

  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new ValidationError('Invalid game ID length', 'gameId');
  }

  // Allow alphanumeric and common URL-safe characters
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError('Invalid game ID format', 'gameId');
  }

  return trimmed;
}

/**
 * Validate an ECO code
 * - Format: A00-E99 (letter followed by two digits)
 */
export function validateEcoCode(eco: string | null | undefined): string {
  if (!eco || typeof eco !== 'string') {
    throw new ValidationError('ECO code is required', 'eco');
  }

  const trimmed = eco.trim().toUpperCase();

  if (!/^[A-E][0-9]{2}$/.test(trimmed)) {
    throw new ValidationError('Invalid ECO code format. Expected format: A00-E99', 'eco');
  }

  return trimmed;
}

/**
 * Validate an optional ECO code
 */
export function validateOptionalEcoCode(eco: string | null | undefined): string | null {
  if (!eco || eco.trim() === '') {
    return null;
  }
  return validateEcoCode(eco);
}

// ============================================
// URL VALIDATORS
// ============================================

/**
 * Validate a game URL
 * - Must be a valid URL
 * - Must be from chess.com or lichess.org
 */
export function validateGameUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('Game URL is required', 'gameUrl');
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    // Only allow chess.com and lichess.org URLs
    const allowedHosts = ['chess.com', 'www.chess.com', 'lichess.org', 'www.lichess.org'];
    if (!allowedHosts.includes(parsed.hostname)) {
      throw new ValidationError(
        'Game URL must be from chess.com or lichess.org',
        'gameUrl'
      );
    }

    return trimmed;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Invalid URL format', 'gameUrl');
  }
}

// ============================================
// DATE VALIDATORS
// ============================================

/**
 * Validate and parse an ISO date string
 */
export function validateDateString(dateStr: string | null | undefined, field = 'date'): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new ValidationError('Date is required', field);
  }

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new ValidationError('Invalid date format. Expected ISO 8601 format', field);
  }

  // Sanity check: date shouldn't be too far in the past or future
  const minDate = new Date('1990-01-01');
  const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

  if (date < minDate || date > maxDate) {
    throw new ValidationError('Date is out of valid range', field);
  }

  return date;
}

/**
 * Validate an optional date string
 */
export function validateOptionalDateString(
  dateStr: string | null | undefined,
  field = 'date'
): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  return validateDateString(dateStr, field);
}

// ============================================
// NUMBER VALIDATORS
// ============================================

/**
 * Validate a rating value
 * - Must be a positive integer
 * - Reasonable range: 0-4000
 */
export function validateRating(
  rating: string | number | null | undefined,
  field = 'rating'
): number {
  const num = typeof rating === 'string' ? parseInt(rating, 10) : rating;

  if (num === null || num === undefined || isNaN(num as number)) {
    throw new ValidationError('Rating is required and must be a number', field);
  }

  if (!Number.isInteger(num) || num < 0 || num > 4000) {
    throw new ValidationError('Rating must be an integer between 0 and 4000', field);
  }

  return num;
}

/**
 * Validate an optional rating
 */
export function validateOptionalRating(
  rating: string | number | null | undefined,
  field = 'rating'
): number | null {
  if (rating === null || rating === undefined || rating === '') {
    return null;
  }
  return validateRating(rating, field);
}

// ============================================
// ARRAY VALIDATORS
// ============================================

/**
 * Validate a comma-separated list and return an array
 * Applies a validator function to each item
 */
export function validateCommaSeparatedList<T>(
  value: string | null | undefined,
  itemValidator: (item: string) => T,
  field: string
): T[] {
  if (!value || value.trim() === '') {
    return [];
  }

  const items = value.split(',').map((s) => s.trim()).filter(Boolean);
  
  try {
    return items.map(itemValidator);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(`Invalid value in ${field}: ${error.message}`, field);
    }
    throw error;
  }
}

// ============================================
// BOOLEAN VALIDATORS
// ============================================

/**
 * Validate a boolean string value
 */
export function validateBooleanString(
  value: string | null | undefined,
  field: string
): boolean | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new ValidationError(`${field} must be "true" or "false"`, field);
}
