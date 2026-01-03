import { describe, it, expect } from 'vitest';
import {
  validatePlayerColor,
  validateSource,
  validateResult,
  validateTimeClass,
  validateUsername,
  validateOptionalUsername,
  validateGameId,
  validateEcoCode,
  validateOptionalEcoCode,
  validateGameUrl,
  validateDateString,
  validateOptionalDateString,
  validateRating,
  validateOptionalRating,
  validateCommaSeparatedList,
  validateBooleanString,
  validatePaginationLimit,
  validatePaginationOffset,
  validateOptionalTimeClass,
  validateOptionalSource,
  validateOptionalResult,
  validateOptionalPlayerColor,
} from '@/lib/shared/validation';
import { ValidationError } from '@/lib/shared/errors';

describe('validation', () => {
  describe('validatePlayerColor', () => {
    it('accepts valid colors', () => {
      expect(validatePlayerColor('white')).toBe('white');
      expect(validatePlayerColor('black')).toBe('black');
    });

    it('rejects invalid colors', () => {
      expect(() => validatePlayerColor('red')).toThrow(ValidationError);
      expect(() => validatePlayerColor(null)).toThrow(ValidationError);
      expect(() => validatePlayerColor(undefined)).toThrow(ValidationError);
    });
  });

  describe('validateSource', () => {
    it('accepts valid sources', () => {
      expect(validateSource('lichess')).toBe('lichess');
      expect(validateSource('chesscom')).toBe('chesscom');
    });

    it('rejects invalid sources', () => {
      expect(() => validateSource('chess24')).toThrow(ValidationError);
      expect(() => validateSource(null)).toThrow(ValidationError);
    });
  });

  describe('validateResult', () => {
    it('accepts valid results', () => {
      expect(validateResult('win')).toBe('win');
      expect(validateResult('loss')).toBe('loss');
      expect(validateResult('draw')).toBe('draw');
    });

    it('rejects invalid results', () => {
      expect(() => validateResult('stalemate')).toThrow(ValidationError);
      expect(() => validateResult(null)).toThrow(ValidationError);
    });
  });

  describe('validateTimeClass', () => {
    it('accepts valid time classes', () => {
      expect(validateTimeClass('bullet')).toBe('bullet');
      expect(validateTimeClass('blitz')).toBe('blitz');
      expect(validateTimeClass('rapid')).toBe('rapid');
      expect(validateTimeClass('classical')).toBe('classical');
    });

    it('rejects invalid time classes', () => {
      expect(() => validateTimeClass('hyperbullet')).toThrow(ValidationError);
      expect(() => validateTimeClass(null)).toThrow(ValidationError);
    });
  });

  describe('validateUsername', () => {
    it('accepts valid usernames', () => {
      expect(validateUsername('DrNykterstein')).toBe('DrNykterstein');
      expect(validateUsername('user_123')).toBe('user_123');
      expect(validateUsername('user-name')).toBe('user-name');
    });

    it('trims whitespace', () => {
      expect(validateUsername('  user  ')).toBe('user');
    });

    it('rejects empty usernames', () => {
      expect(() => validateUsername('')).toThrow(ValidationError);
      expect(() => validateUsername('   ')).toThrow(ValidationError);
      expect(() => validateUsername(null)).toThrow(ValidationError);
    });

    it('rejects usernames with special characters', () => {
      expect(() => validateUsername('user@name')).toThrow(ValidationError);
      expect(() => validateUsername('user name')).toThrow(ValidationError);
      expect(() => validateUsername('user.name')).toThrow(ValidationError);
    });

    it('rejects usernames over 50 characters', () => {
      const longUsername = 'a'.repeat(51);
      expect(() => validateUsername(longUsername)).toThrow(ValidationError);
    });
  });

  describe('validateOptionalUsername', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalUsername(null)).toBeNull();
      expect(validateOptionalUsername(undefined)).toBeNull();
      expect(validateOptionalUsername('')).toBeNull();
      expect(validateOptionalUsername('  ')).toBeNull();
    });

    it('validates non-empty usernames', () => {
      expect(validateOptionalUsername('user')).toBe('user');
    });
  });

  describe('validateGameId', () => {
    it('accepts valid game IDs', () => {
      expect(validateGameId('abc123')).toBe('abc123');
      expect(validateGameId('game_001')).toBe('game_001');
    });

    it('rejects empty IDs', () => {
      expect(() => validateGameId('')).toThrow(ValidationError);
      expect(() => validateGameId(null)).toThrow(ValidationError);
    });

    it('rejects IDs with invalid characters', () => {
      expect(() => validateGameId('game/123')).toThrow(ValidationError);
      expect(() => validateGameId('game@123')).toThrow(ValidationError);
    });
  });

  describe('validateEcoCode', () => {
    it('accepts valid ECO codes', () => {
      expect(validateEcoCode('A00')).toBe('A00');
      expect(validateEcoCode('B50')).toBe('B50');
      expect(validateEcoCode('e99')).toBe('E99');
    });

    it('rejects invalid ECO codes', () => {
      expect(() => validateEcoCode('F00')).toThrow(ValidationError);
      expect(() => validateEcoCode('A0')).toThrow(ValidationError);
      expect(() => validateEcoCode('A100')).toThrow(ValidationError);
      expect(() => validateEcoCode(null)).toThrow(ValidationError);
    });
  });

  describe('validateOptionalEcoCode', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalEcoCode(null)).toBeNull();
      expect(validateOptionalEcoCode('')).toBeNull();
    });

    it('validates non-empty ECO codes', () => {
      expect(validateOptionalEcoCode('B00')).toBe('B00');
    });
  });

  describe('validateGameUrl', () => {
    it('accepts valid chess.com URLs', () => {
      expect(validateGameUrl('https://www.chess.com/game/live/12345')).toBe('https://www.chess.com/game/live/12345');
      expect(validateGameUrl('https://chess.com/game/123')).toBe('https://chess.com/game/123');
    });

    it('accepts valid lichess URLs', () => {
      expect(validateGameUrl('https://lichess.org/abc123')).toBe('https://lichess.org/abc123');
      expect(validateGameUrl('https://www.lichess.org/game')).toBe('https://www.lichess.org/game');
    });

    it('rejects non-chess URLs', () => {
      expect(() => validateGameUrl('https://google.com')).toThrow(ValidationError);
      expect(() => validateGameUrl('https://chess24.com/game')).toThrow(ValidationError);
    });

    it('rejects invalid URLs', () => {
      expect(() => validateGameUrl('not-a-url')).toThrow(ValidationError);
      expect(() => validateGameUrl(null)).toThrow(ValidationError);
    });
  });

  describe('validateDateString', () => {
    it('accepts valid ISO date strings', () => {
      const date = validateDateString('2024-01-15T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('rejects invalid dates', () => {
      expect(() => validateDateString('not-a-date')).toThrow(ValidationError);
      expect(() => validateDateString(null)).toThrow(ValidationError);
    });

    it('rejects dates too far in the past', () => {
      expect(() => validateDateString('1950-01-01')).toThrow(ValidationError);
    });

    it('rejects future dates', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(() => validateDateString(futureDate)).toThrow(ValidationError);
    });
  });

  describe('validateOptionalDateString', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalDateString(null)).toBeNull();
      expect(validateOptionalDateString('')).toBeNull();
    });

    it('validates non-empty dates', () => {
      const result = validateOptionalDateString('2024-01-15');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('validateRating', () => {
    it('accepts valid ratings', () => {
      expect(validateRating(1500)).toBe(1500);
      expect(validateRating('2000')).toBe(2000);
      expect(validateRating(0)).toBe(0);
      expect(validateRating(4000)).toBe(4000);
    });

    it('rejects invalid ratings', () => {
      expect(() => validateRating(-100)).toThrow(ValidationError);
      expect(() => validateRating(5000)).toThrow(ValidationError);
      expect(() => validateRating('abc')).toThrow(ValidationError);
      expect(() => validateRating(null)).toThrow(ValidationError);
    });

    it('rejects non-integer ratings', () => {
      expect(() => validateRating(1500.5)).toThrow(ValidationError);
    });
  });

  describe('validateOptionalRating', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalRating(null)).toBeNull();
      expect(validateOptionalRating(undefined)).toBeNull();
      expect(validateOptionalRating('')).toBeNull();
    });

    it('validates non-empty ratings', () => {
      expect(validateOptionalRating(1500)).toBe(1500);
      expect(validateOptionalRating('2000')).toBe(2000);
    });
  });

  describe('validateCommaSeparatedList', () => {
    it('parses comma-separated values', () => {
      const result = validateCommaSeparatedList(
        'a,b,c',
        (item) => item.toUpperCase(),
        'test'
      );
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('returns empty array for empty input', () => {
      expect(validateCommaSeparatedList('', (x) => x, 'test')).toEqual([]);
      expect(validateCommaSeparatedList(null, (x) => x, 'test')).toEqual([]);
    });

    it('trims whitespace', () => {
      const result = validateCommaSeparatedList(
        ' a , b , c ',
        (item) => item,
        'test'
      );
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('propagates validator errors', () => {
      expect(() =>
        validateCommaSeparatedList(
          'a,b,c',
          () => { throw new ValidationError('invalid', 'field'); },
          'test'
        )
      ).toThrow(ValidationError);
    });
  });

  describe('validateBooleanString', () => {
    it('parses boolean strings', () => {
      expect(validateBooleanString('true', 'field')).toBe(true);
      expect(validateBooleanString('false', 'field')).toBe(false);
    });

    it('returns null for empty values', () => {
      expect(validateBooleanString(null, 'field')).toBeNull();
      expect(validateBooleanString('', 'field')).toBeNull();
    });

    it('rejects invalid boolean strings', () => {
      expect(() => validateBooleanString('yes', 'field')).toThrow(ValidationError);
      expect(() => validateBooleanString('1', 'field')).toThrow(ValidationError);
    });
  });

  describe('validatePaginationLimit', () => {
    it('returns default when value is empty', () => {
      expect(validatePaginationLimit(null, 100, 1000)).toBe(100);
      expect(validatePaginationLimit('', 100, 1000)).toBe(100);
      expect(validatePaginationLimit(undefined, 50, 500)).toBe(50);
    });

    it('parses valid numbers', () => {
      expect(validatePaginationLimit('25', 100, 1000)).toBe(25);
      expect(validatePaginationLimit('1', 100, 1000)).toBe(1);
    });

    it('caps at max value', () => {
      expect(validatePaginationLimit('5000', 100, 1000)).toBe(1000);
      expect(validatePaginationLimit('999999', 100, 500)).toBe(500);
    });

    it('rejects non-numeric values', () => {
      expect(() => validatePaginationLimit('abc', 100, 1000)).toThrow(ValidationError);
      expect(() => validatePaginationLimit('12.5abc', 100, 1000)).toThrow(ValidationError);
    });

    it('rejects values less than 1', () => {
      expect(() => validatePaginationLimit('0', 100, 1000)).toThrow(ValidationError);
      expect(() => validatePaginationLimit('-5', 100, 1000)).toThrow(ValidationError);
    });
  });

  describe('validatePaginationOffset', () => {
    it('returns 0 when value is empty', () => {
      expect(validatePaginationOffset(null)).toBe(0);
      expect(validatePaginationOffset('')).toBe(0);
      expect(validatePaginationOffset(undefined)).toBe(0);
    });

    it('parses valid numbers', () => {
      expect(validatePaginationOffset('0')).toBe(0);
      expect(validatePaginationOffset('100')).toBe(100);
      expect(validatePaginationOffset('999999')).toBe(999999);
    });

    it('rejects non-numeric values', () => {
      expect(() => validatePaginationOffset('abc')).toThrow(ValidationError);
      expect(() => validatePaginationOffset('10abc')).toThrow(ValidationError);
    });

    it('rejects negative values', () => {
      expect(() => validatePaginationOffset('-1')).toThrow(ValidationError);
      expect(() => validatePaginationOffset('-100')).toThrow(ValidationError);
    });
  });

  describe('validateOptionalTimeClass', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalTimeClass(null)).toBeNull();
      expect(validateOptionalTimeClass('')).toBeNull();
    });

    it('returns valid time class', () => {
      expect(validateOptionalTimeClass('blitz')).toBe('blitz');
      expect(validateOptionalTimeClass('rapid')).toBe('rapid');
    });

    it('rejects invalid time class', () => {
      expect(() => validateOptionalTimeClass('fast')).toThrow(ValidationError);
    });
  });

  describe('validateOptionalSource', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalSource(null)).toBeNull();
      expect(validateOptionalSource('')).toBeNull();
    });

    it('returns valid source', () => {
      expect(validateOptionalSource('lichess')).toBe('lichess');
      expect(validateOptionalSource('chesscom')).toBe('chesscom');
    });

    it('rejects invalid source', () => {
      expect(() => validateOptionalSource('chess24')).toThrow(ValidationError);
    });
  });

  describe('validateOptionalResult', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalResult(null)).toBeNull();
      expect(validateOptionalResult('')).toBeNull();
    });

    it('returns valid result', () => {
      expect(validateOptionalResult('win')).toBe('win');
      expect(validateOptionalResult('draw')).toBe('draw');
    });

    it('rejects invalid result', () => {
      expect(() => validateOptionalResult('tie')).toThrow(ValidationError);
    });
  });

  describe('validateOptionalPlayerColor', () => {
    it('returns null for empty values', () => {
      expect(validateOptionalPlayerColor(null)).toBeNull();
      expect(validateOptionalPlayerColor('')).toBeNull();
    });

    it('returns valid color', () => {
      expect(validateOptionalPlayerColor('white')).toBe('white');
      expect(validateOptionalPlayerColor('black')).toBe('black');
    });

    it('rejects invalid color', () => {
      expect(() => validateOptionalPlayerColor('red')).toThrow(ValidationError);
    });
  });
});
