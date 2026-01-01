import { describe, it, expect } from 'vitest';
import {
  mapChessComResult,
  mapTimeClass,
  parseOpeningFromPgn,
  getWeekString,
  formatDate,
  formatDateShort,
  calculateStats,
  calculateWinRateOverTime,
  calculateOpeningStats,
  calculateRatingProgression,
  calculateTimeControlDistribution,
  calculateColorPerformance,
  calculateOpeningsByColor,
  findBestOpenings,
  findWorstOpenings,
  calculateOpponentStats,
  findNemesis,
  findFavoriteOpponent,
  calculateDynamicBrackets,
  calculateRatingBrackets,
  calculateCurrentStreak,
  findLongestWinStreak,
  findLongestLossStreak,
  getTerminationLabel,
  calculateTerminationStats,
  calculateDateStats,
  getGamesForDate,
  getDefaultFilters,
  filterGames,
  getUniqueOpponents,
  getUniqueOpenings,
  calculateAverageGameLength,
  mergeAndSortGames,
  calculateHourlyStats,
  calculateDayOfWeekStats,
  findPeakPerformanceTimes,
  findWorstPerformanceTimes,
  // Phase 6: Game Phase Analysis
  classifyGamePhase,
  getPhaseLabel,
  calculatePhasePerformance,
  // Phase 7: Recommendations
  generateRecommendations,
  // Phase 8: Resilience
  calculateResilienceStats,
  classifyGameResilience,
  generateResilienceInsights,
} from '@/lib/utils';
import { 
  createTestGame, 
  createWinGame, 
  createLossGame, 
  createDrawGame,
  createGameWithAnalysis,
} from '../../fixtures/game';
import type { Game } from '@/lib/types';

describe('Utils', () => {
  // ============================================
  // RESULT & TIME CLASS MAPPING
  // ============================================

  describe('mapChessComResult', () => {
    it('maps win results correctly', () => {
      expect(mapChessComResult('win')).toBe('win');
    });

    it('maps loss results correctly', () => {
      expect(mapChessComResult('checkmated')).toBe('loss');
      expect(mapChessComResult('timeout')).toBe('loss');
      expect(mapChessComResult('resigned')).toBe('loss');
      expect(mapChessComResult('lose')).toBe('loss');
      expect(mapChessComResult('abandoned')).toBe('loss');
    });

    it('maps draw results correctly', () => {
      expect(mapChessComResult('agreed')).toBe('draw');
      expect(mapChessComResult('repetition')).toBe('draw');
      expect(mapChessComResult('stalemate')).toBe('draw');
      expect(mapChessComResult('insufficient')).toBe('draw');
      expect(mapChessComResult('50move')).toBe('draw');
      expect(mapChessComResult('timevsinsufficient')).toBe('draw');
    });

    it('defaults to draw for unknown results', () => {
      expect(mapChessComResult('unknown')).toBe('draw');
    });
  });

  describe('mapTimeClass', () => {
    it('maps bullet correctly', () => {
      expect(mapTimeClass('bullet')).toBe('bullet');
      expect(mapTimeClass('ultrabullet')).toBe('bullet');
      expect(mapTimeClass('BULLET')).toBe('bullet');
    });

    it('maps blitz correctly', () => {
      expect(mapTimeClass('blitz')).toBe('blitz');
      expect(mapTimeClass('BLITZ')).toBe('blitz');
    });

    it('maps rapid correctly', () => {
      expect(mapTimeClass('rapid')).toBe('rapid');
    });

    it('maps classical correctly', () => {
      expect(mapTimeClass('classical')).toBe('classical');
      expect(mapTimeClass('standard')).toBe('classical');
      expect(mapTimeClass('correspondence')).toBe('classical');
    });

    it('defaults to blitz for unknown', () => {
      expect(mapTimeClass('unknown')).toBe('blitz');
    });
  });

  // ============================================
  // PGN PARSING
  // ============================================

  describe('parseOpeningFromPgn', () => {
    it('extracts ECO code from PGN', () => {
      const pgn = '[ECO "B20"]\n[Opening "Sicilian Defense"]';
      const result = parseOpeningFromPgn(pgn);
      expect(result.eco).toBe('B20');
    });

    it('extracts opening name from PGN', () => {
      const pgn = '[ECO "B20"]\n[Opening "Sicilian Defense"]';
      const result = parseOpeningFromPgn(pgn);
      expect(result.name).toBe('Sicilian Defense');
    });

    it('returns Unknown for missing ECO', () => {
      const pgn = '[Opening "Some Opening"]';
      const result = parseOpeningFromPgn(pgn);
      expect(result.eco).toBe('Unknown');
    });

    it('returns Unknown Opening for missing opening name', () => {
      const pgn = '[ECO "C00"]';
      const result = parseOpeningFromPgn(pgn);
      expect(result.name).toBe('Unknown Opening');
    });
  });

  // ============================================
  // DATE HELPERS
  // ============================================

  describe('getWeekString', () => {
    it('returns year-week format', () => {
      const date = new Date('2025-01-15');
      const result = getWeekString(date);
      expect(result).toMatch(/^2025-W\d{2}$/);
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      // Use explicit time to avoid timezone issues
      const date = new Date(2025, 11, 25); // December 25, 2025 (month is 0-indexed)
      const result = formatDate(date);
      expect(result).toBe('Dec 25, 2025');
    });
  });

  describe('formatDateShort', () => {
    it('formats date without year', () => {
      // Use explicit time to avoid timezone issues
      const date = new Date(2025, 11, 25); // December 25, 2025 (month is 0-indexed)
      const result = formatDateShort(date);
      expect(result).toBe('Dec 25');
    });
  });

  // ============================================
  // BASIC STATS CALCULATIONS
  // ============================================

  describe('calculateStats', () => {
    it('calculates correct totals', () => {
      const games = [
        createWinGame({ id: '1' }),
        createWinGame({ id: '2' }),
        createLossGame({ id: '3' }),
        createDrawGame({ id: '4' }),
      ];
      
      const stats = calculateStats(games);
      
      expect(stats.totalGames).toBe(4);
      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(1);
      expect(stats.draws).toBe(1);
    });

    it('calculates win rate correctly', () => {
      const games = [
        createWinGame({ id: '1' }),
        createWinGame({ id: '2' }),
        createLossGame({ id: '3' }),
        createLossGame({ id: '4' }),
      ];
      
      const stats = calculateStats(games);
      expect(stats.winRate).toBe(50);
    });

    it('handles empty games array', () => {
      const stats = calculateStats([]);
      
      expect(stats.totalGames).toBe(0);
      expect(stats.winRate).toBe(0);
    });

    it('handles all wins', () => {
      const games = [
        createWinGame({ id: '1' }),
        createWinGame({ id: '2' }),
      ];
      
      const stats = calculateStats(games);
      expect(stats.winRate).toBe(100);
    });
  });

  describe('calculateWinRateOverTime', () => {
    it('returns empty array for no games', () => {
      const result = calculateWinRateOverTime([]);
      expect(result).toEqual([]);
    });

    it('groups games by week', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-06') }),
        createWinGame({ id: '2', playedAt: new Date('2025-01-07') }),
        createLossGame({ id: '3', playedAt: new Date('2025-01-13') }),
      ];
      
      const result = calculateWinRateOverTime(games);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toHaveProperty('week');
      expect(result[0]).toHaveProperty('winRate');
      expect(result[0]).toHaveProperty('games');
    });
  });

  describe('calculateOpeningStats', () => {
    it('groups by ECO code', () => {
      const games = [
        createTestGame({ id: '1', opening: { eco: 'B20', name: 'Sicilian' }, result: 'win' }),
        createTestGame({ id: '2', opening: { eco: 'B20', name: 'Sicilian' }, result: 'loss' }),
        createTestGame({ id: '3', opening: { eco: 'C00', name: 'French' }, result: 'win' }),
      ];
      
      const result = calculateOpeningStats(games);
      
      const sicilian = result.find((o) => o.eco === 'B20');
      expect(sicilian).toBeDefined();
      expect(sicilian?.total).toBe(2);
      expect(sicilian?.wins).toBe(1);
      expect(sicilian?.losses).toBe(1);
    });

    it('excludes unknown openings', () => {
      const games = [
        createTestGame({ id: '1', opening: { eco: 'Unknown', name: 'Unknown Opening' }, result: 'win' }),
        createTestGame({ id: '2', opening: { eco: 'B20', name: 'Sicilian' }, result: 'win' }),
      ];
      
      const result = calculateOpeningStats(games);
      
      expect(result.find((o) => o.eco === 'Unknown')).toBeUndefined();
    });

    it('returns top 10 openings sorted by total', () => {
      const games = Array.from({ length: 50 }, (_, i) =>
        createTestGame({
          id: String(i),
          opening: { eco: `E${String(i).padStart(2, '0')}`, name: `Opening ${i}` },
        })
      );
      
      const result = calculateOpeningStats(games);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateRatingProgression', () => {
    it('returns empty array for no games', () => {
      const result = calculateRatingProgression([]);
      expect(result).toEqual([]);
    });

    it('returns sorted by date', () => {
      const games = [
        createTestGame({ id: '1', playedAt: new Date('2025-01-03'), playerRating: 1000 }),
        createTestGame({ id: '2', playedAt: new Date('2025-01-01'), playerRating: 900 }),
        createTestGame({ id: '3', playedAt: new Date('2025-01-02'), playerRating: 950 }),
      ];
      
      const result = calculateRatingProgression(games);
      
      expect(result[0].rating).toBe(900);
      expect(result[1].rating).toBe(950);
      expect(result[2].rating).toBe(1000);
    });
  });

  describe('calculateTimeControlDistribution', () => {
    it('counts games by time class', () => {
      const games = [
        createTestGame({ id: '1', timeClass: 'bullet' }),
        createTestGame({ id: '2', timeClass: 'bullet' }),
        createTestGame({ id: '3', timeClass: 'blitz' }),
        createTestGame({ id: '4', timeClass: 'rapid' }),
      ];
      
      const result = calculateTimeControlDistribution(games);
      
      const bullet = result.find((tc) => tc.timeClass === 'bullet');
      expect(bullet?.count).toBe(2);
      expect(bullet?.percentage).toBe(50);
    });
  });

  describe('calculateColorPerformance', () => {
    it('calculates white and black performance', () => {
      const games = [
        createWinGame({ id: '1', playerColor: 'white' }),
        createWinGame({ id: '2', playerColor: 'white' }),
        createLossGame({ id: '3', playerColor: 'white' }),
        createWinGame({ id: '4', playerColor: 'black' }),
        createLossGame({ id: '5', playerColor: 'black' }),
      ];
      
      const result = calculateColorPerformance(games);
      
      const white = result.find((c) => c.color === 'white');
      const black = result.find((c) => c.color === 'black');
      
      expect(white?.games).toBe(3);
      expect(white?.wins).toBe(2);
      expect(white?.winRate).toBeCloseTo(66.67, 1);
      
      expect(black?.games).toBe(2);
      expect(black?.wins).toBe(1);
      expect(black?.winRate).toBe(50);
    });
  });

  // ============================================
  // OPENING ANALYSIS BY COLOR
  // ============================================

  describe('calculateOpeningsByColor', () => {
    it('filters by color', () => {
      const games = [
        createTestGame({ id: '1', playerColor: 'white', opening: { eco: 'E4', name: 'Kings Pawn' } }),
        createTestGame({ id: '2', playerColor: 'black', opening: { eco: 'B20', name: 'Sicilian' } }),
      ];
      
      const whiteOpenings = calculateOpeningsByColor(games, 'white');
      const blackOpenings = calculateOpeningsByColor(games, 'black');
      
      expect(whiteOpenings.find((o) => o.eco === 'E4')).toBeDefined();
      expect(whiteOpenings.find((o) => o.eco === 'B20')).toBeUndefined();
      
      expect(blackOpenings.find((o) => o.eco === 'B20')).toBeDefined();
    });
  });

  describe('findBestOpenings', () => {
    it('returns openings sorted by win rate', () => {
      const games = [
        // High win rate opening
        ...Array(5).fill(null).map((_, i) => createWinGame({ id: `w${i}`, playerColor: 'white', opening: { eco: 'E4', name: 'Kings Pawn' } })),
        createLossGame({ id: 'l1', playerColor: 'white', opening: { eco: 'E4', name: 'Kings Pawn' } }),
        // Low win rate opening
        createWinGame({ id: 'w6', playerColor: 'white', opening: { eco: 'D4', name: 'Queens Pawn' } }),
        ...Array(4).fill(null).map((_, i) => createLossGame({ id: `l${i + 2}`, playerColor: 'white', opening: { eco: 'D4', name: 'Queens Pawn' } })),
      ];
      
      const best = findBestOpenings(games, 'white', 3, 5);
      
      expect(best[0].eco).toBe('E4');
      expect(best[0].winRate).toBeGreaterThan(best[1]?.winRate || 0);
    });

    it('respects minGames parameter', () => {
      const games = [
        createWinGame({ id: '1', playerColor: 'white', opening: { eco: 'E4', name: 'Kings Pawn' } }),
        createWinGame({ id: '2', playerColor: 'white', opening: { eco: 'E4', name: 'Kings Pawn' } }),
      ];
      
      const best = findBestOpenings(games, 'white', 3, 5);
      expect(best.length).toBe(0);
    });
  });

  describe('findWorstOpenings', () => {
    it('returns openings sorted by lowest win rate', () => {
      const games = [
        // Low win rate opening
        createWinGame({ id: 'w1', playerColor: 'white', opening: { eco: 'D4', name: 'Queens Pawn' } }),
        ...Array(4).fill(null).map((_, i) => createLossGame({ id: `l${i}`, playerColor: 'white', opening: { eco: 'D4', name: 'Queens Pawn' } })),
        // High win rate opening
        ...Array(5).fill(null).map((_, i) => createWinGame({ id: `w${i + 2}`, playerColor: 'white', opening: { eco: 'E4', name: 'Kings Pawn' } })),
      ];
      
      const worst = findWorstOpenings(games, 'white', 3, 5);
      
      expect(worst[0].eco).toBe('D4');
    });
  });

  // ============================================
  // OPPONENT ANALYSIS
  // ============================================

  describe('calculateOpponentStats', () => {
    it('groups games by opponent', () => {
      const games = [
        createWinGame({ id: '1', opponent: { username: 'player1', rating: 1500 } }),
        createWinGame({ id: '2', opponent: { username: 'player1', rating: 1500 } }),
        createLossGame({ id: '3', opponent: { username: 'player2', rating: 1600 } }),
      ];
      
      const stats = calculateOpponentStats(games);
      
      const player1 = stats.find((o) => o.username === 'player1');
      expect(player1?.games).toBe(2);
      expect(player1?.wins).toBe(2);
    });

    it('calculates average rating', () => {
      const games = [
        createWinGame({ id: '1', opponent: { username: 'player1', rating: 1500 } }),
        createWinGame({ id: '2', opponent: { username: 'player1', rating: 1600 } }),
      ];
      
      const stats = calculateOpponentStats(games);
      const player1 = stats.find((o) => o.username === 'player1');
      
      expect(player1?.avgRating).toBe(1550);
    });
  });

  describe('findNemesis', () => {
    it('finds opponent with most losses', () => {
      const games = [
        createLossGame({ id: '1', opponent: { username: 'nemesis', rating: 1500 } }),
        createLossGame({ id: '2', opponent: { username: 'nemesis', rating: 1500 } }),
        createLossGame({ id: '3', opponent: { username: 'nemesis', rating: 1500 } }),
        createWinGame({ id: '4', opponent: { username: 'nemesis', rating: 1500 } }),
        createWinGame({ id: '5', opponent: { username: 'friend', rating: 1400 } }),
        createWinGame({ id: '6', opponent: { username: 'friend', rating: 1400 } }),
      ];
      
      const nemesis = findNemesis(games, 2);
      
      expect(nemesis?.username).toBe('nemesis');
    });

    it('returns null when no nemesis found', () => {
      const games = [
        createWinGame({ id: '1', opponent: { username: 'player1', rating: 1500 } }),
        createWinGame({ id: '2', opponent: { username: 'player1', rating: 1500 } }),
      ];
      
      const nemesis = findNemesis(games, 2);
      expect(nemesis).toBeNull();
    });
  });

  describe('findFavoriteOpponent', () => {
    it('finds opponent with most wins', () => {
      const games = [
        createWinGame({ id: '1', opponent: { username: 'favorite', rating: 1500 } }),
        createWinGame({ id: '2', opponent: { username: 'favorite', rating: 1500 } }),
        createWinGame({ id: '3', opponent: { username: 'favorite', rating: 1500 } }),
        createLossGame({ id: '4', opponent: { username: 'other', rating: 1600 } }),
      ];
      
      const favorite = findFavoriteOpponent(games, 2);
      
      expect(favorite?.username).toBe('favorite');
    });
  });

  // ============================================
  // RATING BRACKETS
  // ============================================

  describe('calculateDynamicBrackets', () => {
    it('returns default for empty games', () => {
      const result = calculateDynamicBrackets([]);
      expect(result).toEqual({ min: 0, max: 0, size: 200 });
    });

    it('calculates appropriate bracket size', () => {
      const games = [
        createTestGame({ id: '1', opponent: { username: 'p1', rating: 1000 } }),
        createTestGame({ id: '2', opponent: { username: 'p2', rating: 1500 } }),
      ];
      
      const result = calculateDynamicBrackets(games);
      
      expect(result.min).toBeLessThanOrEqual(1000);
      expect(result.max).toBe(1500);
      expect(result.size).toBeGreaterThanOrEqual(100);
    });
  });

  describe('calculateRatingBrackets', () => {
    it('returns empty array for no games', () => {
      const result = calculateRatingBrackets([]);
      expect(result).toEqual([]);
    });

    it('groups games into brackets', () => {
      const games = [
        createWinGame({ id: '1', opponent: { username: 'p1', rating: 1000 } }),
        createWinGame({ id: '2', opponent: { username: 'p2', rating: 1050 } }),
        createLossGame({ id: '3', opponent: { username: 'p3', rating: 1500 } }),
      ];
      
      const result = calculateRatingBrackets(games);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('bracket');
      expect(result[0]).toHaveProperty('winRate');
    });
  });

  // ============================================
  // STREAKS
  // ============================================

  describe('calculateCurrentStreak', () => {
    it('returns null for no games', () => {
      const result = calculateCurrentStreak([]);
      expect(result).toBeNull();
    });

    it('detects win streak', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-03') }),
        createWinGame({ id: '2', playedAt: new Date('2025-01-02') }),
        createWinGame({ id: '3', playedAt: new Date('2025-01-01') }),
      ];
      
      const streak = calculateCurrentStreak(games);
      
      expect(streak?.type).toBe('win');
      expect(streak?.count).toBe(3);
    });

    it('detects loss streak', () => {
      const games = [
        createLossGame({ id: '1', playedAt: new Date('2025-01-03') }),
        createLossGame({ id: '2', playedAt: new Date('2025-01-02') }),
        createWinGame({ id: '3', playedAt: new Date('2025-01-01') }),
      ];
      
      const streak = calculateCurrentStreak(games);
      
      expect(streak?.type).toBe('loss');
      expect(streak?.count).toBe(2);
    });

    it('returns null for streak less than 2', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-02') }),
        createLossGame({ id: '2', playedAt: new Date('2025-01-01') }),
      ];
      
      const streak = calculateCurrentStreak(games);
      expect(streak).toBeNull();
    });
  });

  describe('findLongestWinStreak', () => {
    it('finds longest consecutive wins', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-01') }),
        createWinGame({ id: '2', playedAt: new Date('2025-01-02') }),
        createLossGame({ id: '3', playedAt: new Date('2025-01-03') }),
        createWinGame({ id: '4', playedAt: new Date('2025-01-04') }),
        createWinGame({ id: '5', playedAt: new Date('2025-01-05') }),
        createWinGame({ id: '6', playedAt: new Date('2025-01-06') }),
        createWinGame({ id: '7', playedAt: new Date('2025-01-07') }),
      ];
      
      const streak = findLongestWinStreak(games);
      
      expect(streak?.count).toBe(4);
    });
  });

  describe('findLongestLossStreak', () => {
    it('finds longest consecutive losses', () => {
      const games = [
        createLossGame({ id: '1', playedAt: new Date('2025-01-01') }),
        createLossGame({ id: '2', playedAt: new Date('2025-01-02') }),
        createLossGame({ id: '3', playedAt: new Date('2025-01-03') }),
        createWinGame({ id: '4', playedAt: new Date('2025-01-04') }),
      ];
      
      const streak = findLongestLossStreak(games);
      
      expect(streak?.count).toBe(3);
    });
  });

  // ============================================
  // TERMINATION ANALYSIS
  // ============================================

  describe('getTerminationLabel', () => {
    it('returns correct labels', () => {
      expect(getTerminationLabel('checkmate')).toBe('Checkmate');
      expect(getTerminationLabel('resignation')).toBe('Resignation');
      expect(getTerminationLabel('timeout')).toBe('Timeout');
      expect(getTerminationLabel('stalemate')).toBe('Stalemate');
    });
  });

  describe('calculateTerminationStats', () => {
    it('counts wins and losses by termination', () => {
      const games = [
        createWinGame({ id: '1', termination: 'checkmate' }),
        createWinGame({ id: '2', termination: 'checkmate' }),
        createLossGame({ id: '3', termination: 'checkmate' }),
        createWinGame({ id: '4', termination: 'timeout' }),
      ];
      
      const stats = calculateTerminationStats(games);
      
      const checkmate = stats.find((s) => s.termination === 'checkmate');
      expect(checkmate?.asWinner).toBe(2);
      expect(checkmate?.asLoser).toBe(1);
      expect(checkmate?.total).toBe(3);
    });
  });

  // ============================================
  // DAILY PERFORMANCE
  // ============================================

  describe('calculateDateStats', () => {
    it('groups games by date', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-15T10:00:00') }),
        createWinGame({ id: '2', playedAt: new Date('2025-01-15T14:00:00') }),
        createLossGame({ id: '3', playedAt: new Date('2025-01-16T10:00:00') }),
      ];
      
      const stats = calculateDateStats(games);
      
      const jan15 = stats.find((s) => s.date === '2025-01-15');
      expect(jan15?.games).toBe(2);
      expect(jan15?.wins).toBe(2);
    });

    it('calculates win rate per day', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-15T10:00:00') }),
        createLossGame({ id: '2', playedAt: new Date('2025-01-15T14:00:00') }),
      ];
      
      const stats = calculateDateStats(games);
      const jan15 = stats.find((s) => s.date === '2025-01-15');
      
      expect(jan15?.winRate).toBe(50);
    });
  });

  describe('getGamesForDate', () => {
    it('returns games for specific date', () => {
      const games = [
        createTestGame({ id: '1', playedAt: new Date('2025-01-15T10:00:00') }),
        createTestGame({ id: '2', playedAt: new Date('2025-01-15T14:00:00') }),
        createTestGame({ id: '3', playedAt: new Date('2025-01-16T10:00:00') }),
      ];
      
      const result = getGamesForDate(games, '2025-01-15');
      
      expect(result.length).toBe(2);
    });
  });

  // ============================================
  // FILTERING
  // ============================================

  describe('getDefaultFilters', () => {
    it('returns default filter state', () => {
      const defaults = getDefaultFilters();
      
      expect(defaults.maxGames).toBe(0);
      expect(defaults.timeClasses).toEqual([]);
      expect(defaults.colors).toEqual([]);
      expect(defaults.results).toEqual([]);
    });
  });

  describe('filterGames', () => {
    const games: Game[] = [
      createTestGame({ id: '1', timeClass: 'bullet', playerColor: 'white', result: 'win', playedAt: new Date('2025-01-10') }),
      createTestGame({ id: '2', timeClass: 'blitz', playerColor: 'black', result: 'loss', playedAt: new Date('2025-01-11') }),
      createTestGame({ id: '3', timeClass: 'rapid', playerColor: 'white', result: 'draw', playedAt: new Date('2025-01-12') }),
    ];

    it('filters by time class', () => {
      const result = filterGames(games, { timeClasses: ['bullet'] });
      expect(result.length).toBe(1);
      expect(result[0].timeClass).toBe('bullet');
    });

    it('filters by color', () => {
      const result = filterGames(games, { colors: ['white'] });
      expect(result.length).toBe(2);
    });

    it('filters by result', () => {
      const result = filterGames(games, { results: ['win'] });
      expect(result.length).toBe(1);
      expect(result[0].result).toBe('win');
    });

    it('filters by date range', () => {
      const result = filterGames(games, {
        dateRange: { start: new Date('2025-01-11'), end: new Date('2025-01-12') },
      });
      expect(result.length).toBe(2);
    });

    it('applies maxGames limit', () => {
      const result = filterGames(games, { maxGames: 2 });
      expect(result.length).toBe(2);
    });

    it('combines multiple filters', () => {
      const result = filterGames(games, {
        timeClasses: ['bullet', 'blitz'],
        colors: ['white'],
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  describe('getUniqueOpponents', () => {
    it('returns unique opponent usernames', () => {
      const games = [
        createTestGame({ id: '1', opponent: { username: 'player1', rating: 1500 } }),
        createTestGame({ id: '2', opponent: { username: 'player2', rating: 1600 } }),
        createTestGame({ id: '3', opponent: { username: 'player1', rating: 1500 } }),
      ];
      
      const opponents = getUniqueOpponents(games);
      
      expect(opponents).toHaveLength(2);
      expect(opponents).toContain('player1');
      expect(opponents).toContain('player2');
    });
  });

  describe('getUniqueOpenings', () => {
    it('returns unique openings', () => {
      const games = [
        createTestGame({ id: '1', opening: { eco: 'B20', name: 'Sicilian' } }),
        createTestGame({ id: '2', opening: { eco: 'C00', name: 'French' } }),
        createTestGame({ id: '3', opening: { eco: 'B20', name: 'Sicilian' } }),
      ];
      
      const openings = getUniqueOpenings(games);
      
      expect(openings).toHaveLength(2);
    });

    it('excludes unknown openings', () => {
      const games = [
        createTestGame({ id: '1', opening: { eco: 'Unknown', name: 'Unknown Opening' } }),
        createTestGame({ id: '2', opening: { eco: 'B20', name: 'Sicilian' } }),
      ];
      
      const openings = getUniqueOpenings(games);
      
      expect(openings).toHaveLength(1);
    });
  });

  describe('calculateAverageGameLength', () => {
    it('calculates average move count', () => {
      const games = [
        createTestGame({ id: '1', moveCount: 30 }),
        createTestGame({ id: '2', moveCount: 40 }),
        createTestGame({ id: '3', moveCount: 50 }),
      ];
      
      const avg = calculateAverageGameLength(games);
      expect(avg).toBe(40);
    });

    it('excludes games with 0 moves', () => {
      const games = [
        createTestGame({ id: '1', moveCount: 30 }),
        createTestGame({ id: '2', moveCount: 0 }),
      ];
      
      const avg = calculateAverageGameLength(games);
      expect(avg).toBe(30);
    });

    it('returns 0 for empty array', () => {
      const avg = calculateAverageGameLength([]);
      expect(avg).toBe(0);
    });
  });

  describe('mergeAndSortGames', () => {
    it('merges and sorts by date descending', () => {
      const games1 = [
        createTestGame({ id: '1', playedAt: new Date('2025-01-01') }),
        createTestGame({ id: '3', playedAt: new Date('2025-01-03') }),
      ];
      const games2 = [
        createTestGame({ id: '2', playedAt: new Date('2025-01-02') }),
      ];
      
      const merged = mergeAndSortGames([games1, games2]);
      
      expect(merged.length).toBe(3);
      expect(merged[0].id).toBe('3');
      expect(merged[1].id).toBe('2');
      expect(merged[2].id).toBe('1');
    });
  });

  // ============================================
  // TIME-OF-DAY PERFORMANCE
  // ============================================

  describe('calculateHourlyStats', () => {
    it('returns stats for all 24 hours', () => {
      const games = [
        createWinGame({ id: '1', playedAt: new Date('2025-01-15T10:30:00') }),
        createLossGame({ id: '2', playedAt: new Date('2025-01-15T10:45:00') }),
      ];
      
      const stats = calculateHourlyStats(games);
      
      expect(stats.length).toBe(24);
      
      const hour10 = stats.find((s) => s.hour === 10);
      expect(hour10?.games).toBe(2);
      expect(hour10?.wins).toBe(1);
      expect(hour10?.losses).toBe(1);
    });
  });

  describe('calculateDayOfWeekStats', () => {
    it('returns stats for all 7 days', () => {
      // Use explicit date constructor to avoid timezone issues
      // January 13, 2025 is a Monday
      const games = [
        createWinGame({ id: '1', playedAt: new Date(2025, 0, 13, 12, 0, 0) }),
        createWinGame({ id: '2', playedAt: new Date(2025, 0, 13, 14, 0, 0) }),
      ];
      
      const stats = calculateDayOfWeekStats(games);
      
      expect(stats.length).toBe(7);
      
      const monday = stats.find((s) => s.dayName === 'Monday');
      expect(monday?.games).toBe(2);
    });
  });

  describe('findPeakPerformanceTimes', () => {
    it('returns null when not enough games', () => {
      const games = [createWinGame({ id: '1' })];
      const result = findPeakPerformanceTimes(games, 10);
      expect(result).toBeNull();
    });

    it('finds best 3-hour window', () => {
      // Create many games at specific hours
      const games: Game[] = [];
      for (let i = 0; i < 20; i++) {
        games.push(
          createWinGame({ 
            id: `w${i}`, 
            playedAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T14:00:00`) 
          })
        );
      }
      for (let i = 0; i < 10; i++) {
        games.push(
          createLossGame({ 
            id: `l${i}`, 
            playedAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T22:00:00`) 
          })
        );
      }
      
      const peak = findPeakPerformanceTimes(games, 5);
      
      expect(peak).not.toBeNull();
      expect(peak?.winRate).toBeGreaterThan(50);
    });
  });

  describe('findWorstPerformanceTimes', () => {
    it('finds worst 3-hour window', () => {
      const games: Game[] = [];
      // Many wins at 10am
      for (let i = 0; i < 15; i++) {
        games.push(
          createWinGame({ 
            id: `w${i}`, 
            playedAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T10:00:00`) 
          })
        );
      }
      // Many losses at 2am
      for (let i = 0; i < 15; i++) {
        games.push(
          createLossGame({ 
            id: `l${i}`, 
            playedAt: new Date(`2025-01-${String(i + 1).padStart(2, '0')}T02:00:00`) 
          })
        );
      }
      
      const worst = findWorstPerformanceTimes(games, 5);
      
      expect(worst).not.toBeNull();
      expect(worst?.winRate).toBeLessThan(50);
    });
  });

  // ============================================
  // PHASE 6: GAME PHASE ANALYSIS
  // ============================================

  describe('classifyGamePhase', () => {
    it('classifies moves 1-15 as opening', () => {
      expect(classifyGamePhase(1)).toBe('opening');
      expect(classifyGamePhase(10)).toBe('opening');
      expect(classifyGamePhase(15)).toBe('opening');
    });

    it('classifies moves 16-40 as middlegame', () => {
      expect(classifyGamePhase(16)).toBe('middlegame');
      expect(classifyGamePhase(25)).toBe('middlegame');
      expect(classifyGamePhase(40)).toBe('middlegame');
    });

    it('classifies moves 41+ as endgame', () => {
      expect(classifyGamePhase(41)).toBe('endgame');
      expect(classifyGamePhase(60)).toBe('endgame');
      expect(classifyGamePhase(100)).toBe('endgame');
    });
  });

  describe('getPhaseLabel', () => {
    it('returns correct labels for each phase', () => {
      expect(getPhaseLabel('opening')).toBe('Opening');
      expect(getPhaseLabel('middlegame')).toBe('Middlegame');
      expect(getPhaseLabel('endgame')).toBe('Endgame');
    });
  });

  describe('calculatePhasePerformance', () => {
    it('returns empty stats for no games', () => {
      const result = calculatePhasePerformance([]);
      
      expect(result.gamesAnalyzed).toBe(0);
      expect(result.opening.blunders).toBe(0);
      expect(result.middlegame.blunders).toBe(0);
      expect(result.endgame.blunders).toBe(0);
    });

    it('returns empty stats for games without analysis', () => {
      const games = [
        createTestGame({ id: '1' }),
        createTestGame({ id: '2' }),
      ];
      
      const result = calculatePhasePerformance(games);
      
      expect(result.gamesAnalyzed).toBe(0);
    });

    it('calculates phase stats from games with analysis', () => {
      const games = [
        createGameWithAnalysis({ 
          id: '1', 
          moveCount: 30, // Medium game
          analysis: { blunders: 2, mistakes: 3, inaccuracies: 4, acpl: 40, accuracy: 80, analyzedAt: new Date() }
        }),
        createGameWithAnalysis({ 
          id: '2', 
          moveCount: 50, // Long game
          analysis: { blunders: 3, mistakes: 2, inaccuracies: 3, acpl: 35, accuracy: 82, analyzedAt: new Date() }
        }),
      ];
      
      const result = calculatePhasePerformance(games);
      
      expect(result.gamesAnalyzed).toBe(2);
      expect(result.opening.blunders).toBeGreaterThanOrEqual(0);
      expect(result.middlegame.blunders).toBeGreaterThanOrEqual(0);
    });

    it('identifies weakest and strongest phases', () => {
      const games = [
        createGameWithAnalysis({ 
          id: '1', 
          moveCount: 50,
          analysis: { blunders: 5, mistakes: 5, inaccuracies: 5, acpl: 50, accuracy: 75, analyzedAt: new Date() }
        }),
      ];
      
      const result = calculatePhasePerformance(games);
      
      expect(['opening', 'middlegame', 'endgame']).toContain(result.weakestPhase);
      expect(['opening', 'middlegame', 'endgame']).toContain(result.strongestPhase);
    });
  });

  // ============================================
  // PHASE 7: RECOMMENDATIONS
  // ============================================

  describe('generateRecommendations', () => {
    it('returns empty array for fewer than 10 games', () => {
      const games = [
        createTestGame({ id: '1' }),
        createTestGame({ id: '2' }),
      ];
      
      const recommendations = generateRecommendations(games);
      
      expect(recommendations).toHaveLength(0);
    });

    it('generates opening recommendations for weak openings', () => {
      const games: Game[] = [];
      
      // Create many games with a weak opening
      for (let i = 0; i < 10; i++) {
        games.push(createLossGame({ 
          id: `weak-${i}`, 
          opening: { eco: 'A00', name: 'Bad Opening' },
          playerColor: 'white',
        }));
      }
      // Add some wins in other openings
      for (let i = 0; i < 5; i++) {
        games.push(createWinGame({ 
          id: `good-${i}`, 
          opening: { eco: 'B20', name: 'Good Opening' },
          playerColor: 'white',
        }));
      }
      
      const recommendations = generateRecommendations(games);
      
      const openingRec = recommendations.find(r => r.type === 'opening_study');
      expect(openingRec).toBeDefined();
    });

    it('limits recommendations to 6', () => {
      // Create a scenario with many potential recommendations
      const games: Game[] = [];
      for (let i = 0; i < 30; i++) {
        games.push(createLossGame({ 
          id: `loss-${i}`,
          termination: 'timeout',
          opening: { eco: 'A00', name: 'Weak Opening' },
          playerColor: 'white',
        }));
      }
      
      const recommendations = generateRecommendations(games);
      
      expect(recommendations.length).toBeLessThanOrEqual(6);
    });

    it('sorts recommendations by priority', () => {
      const games: Game[] = [];
      for (let i = 0; i < 20; i++) {
        games.push(createLossGame({ 
          id: `loss-${i}`,
          termination: 'timeout',
          opening: { eco: 'A00', name: 'Weak Opening' },
          playerColor: 'white',
        }));
      }
      
      const recommendations = generateRecommendations(games);
      
      if (recommendations.length >= 2) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < recommendations.length; i++) {
          const prev = priorityOrder[recommendations[i - 1].priority as keyof typeof priorityOrder];
          const curr = priorityOrder[recommendations[i].priority as keyof typeof priorityOrder];
          expect(curr).toBeGreaterThanOrEqual(prev);
        }
      }
    });
  });

  // ============================================
  // PHASE 8: RESILIENCE ANALYSIS
  // ============================================

  describe('calculateResilienceStats', () => {
    it('returns zero stats for games without analysis', () => {
      const games = [
        createTestGame({ id: '1' }),
        createTestGame({ id: '2' }),
      ];
      
      const stats = calculateResilienceStats(games);
      
      expect(stats.comebackWins).toBe(0);
      expect(stats.blownWins).toBe(0);
      expect(stats.volatileGames).toBe(0);
    });

    it('calculates stats from analyzed games', () => {
      const games = [
        createGameWithAnalysis({ 
          id: '1', 
          result: 'win',
          analysis: { blunders: 3, mistakes: 2, inaccuracies: 3, acpl: 50, accuracy: 75, analyzedAt: new Date() }
        }),
        createGameWithAnalysis({ 
          id: '2', 
          result: 'loss',
          analysis: { blunders: 2, mistakes: 3, inaccuracies: 4, acpl: 45, accuracy: 78, analyzedAt: new Date() }
        }),
        createGameWithAnalysis({ 
          id: '3', 
          result: 'win',
          analysis: { blunders: 0, mistakes: 1, inaccuracies: 2, acpl: 20, accuracy: 92, analyzedAt: new Date() }
        }),
      ];
      
      const stats = calculateResilienceStats(games);
      
      expect(stats.mentalScore).toBeGreaterThanOrEqual(0);
      expect(stats.mentalScore).toBeLessThanOrEqual(100);
    });

    it('identifies volatile games', () => {
      const games = [
        createGameWithAnalysis({ 
          id: '1', 
          analysis: { blunders: 5, mistakes: 5, inaccuracies: 5, acpl: 100, accuracy: 60, analyzedAt: new Date() }
        }),
      ];
      
      const stats = calculateResilienceStats(games);
      
      expect(stats.volatileGames).toBeGreaterThanOrEqual(1);
    });

    it('calculates comeback and blow rates', () => {
      const games = [
        // Potential comeback win (win with errors)
        createGameWithAnalysis({ 
          id: '1', 
          result: 'win',
          analysis: { blunders: 2, mistakes: 2, inaccuracies: 2, acpl: 40, accuracy: 75, analyzedAt: new Date() }
        }),
        // Potential blown win (loss with errors)
        createGameWithAnalysis({ 
          id: '2', 
          result: 'loss',
          analysis: { blunders: 2, mistakes: 2, inaccuracies: 2, acpl: 40, accuracy: 75, analyzedAt: new Date() }
        }),
        // Clean win
        createGameWithAnalysis({ 
          id: '3', 
          result: 'win',
          analysis: { blunders: 0, mistakes: 0, inaccuracies: 1, acpl: 15, accuracy: 95, analyzedAt: new Date() }
        }),
      ];
      
      const stats = calculateResilienceStats(games);
      
      expect(stats.comebackRate).toBeGreaterThanOrEqual(0);
      expect(stats.comebackRate).toBeLessThanOrEqual(100);
      expect(stats.blowRate).toBeGreaterThanOrEqual(0);
      expect(stats.blowRate).toBeLessThanOrEqual(100);
    });
  });

  describe('classifyGameResilience', () => {
    it('classifies a game with default values', () => {
      const game = createTestGame({ id: '1', result: 'win' });
      
      const result = classifyGameResilience(game);
      
      expect(result.gameId).toBe('1');
      expect(result.result).toBe('win');
      expect(result.isComeback).toBe(false);
      expect(result.isBlownWin).toBe(false);
    });

    it('identifies a comeback win', () => {
      const game = createWinGame({ id: '1' });
      
      const result = classifyGameResilience(game, -300, 50); // Was down 300cp, got up to +50
      
      expect(result.isComeback).toBe(true);
      expect(result.isBlownWin).toBe(false);
    });

    it('identifies a blown win', () => {
      const game = createLossGame({ id: '1' });
      
      const result = classifyGameResilience(game, -50, 300); // Was up 300cp, ended losing
      
      expect(result.isComeback).toBe(false);
      expect(result.isBlownWin).toBe(true);
    });

    it('counts eval swings from analysis data', () => {
      const game = createGameWithAnalysis({
        id: '1',
        analysis: { blunders: 3, mistakes: 2, inaccuracies: 2, acpl: 50, accuracy: 75, analyzedAt: new Date() }
      });
      
      const result = classifyGameResilience(game);
      
      // Eval swings = blunders * 2 + mistakes = 3 * 2 + 2 = 8
      expect(result.evalSwings).toBe(8);
    });
  });

  describe('generateResilienceInsights', () => {
    it('returns empty array for insufficient data', () => {
      const games = [
        createTestGame({ id: '1' }),
        createTestGame({ id: '2' }),
      ];
      
      const insights = generateResilienceInsights(games);
      
      expect(insights).toHaveLength(0);
    });

    it('generates mental score insight with enough analyzed games', () => {
      const games: Game[] = [];
      for (let i = 0; i < 10; i++) {
        games.push(createGameWithAnalysis({ 
          id: `game-${i}`,
          result: i % 2 === 0 ? 'win' : 'loss',
          analysis: { blunders: 1, mistakes: 2, inaccuracies: 3, acpl: 35, accuracy: 80, analyzedAt: new Date() }
        }));
      }
      
      const insights = generateResilienceInsights(games);
      
      const mentalInsight = insights.find(i => i.id === 'mental-score');
      expect(mentalInsight).toBeDefined();
      expect(mentalInsight?.title).toBe('Mental Game Score');
    });

    it('generates comeback insight when applicable', () => {
      const games: Game[] = [];
      // Create many "comeback" style wins (wins with errors)
      for (let i = 0; i < 10; i++) {
        games.push(createGameWithAnalysis({ 
          id: `comeback-${i}`,
          result: 'win',
          analysis: { blunders: 2, mistakes: 2, inaccuracies: 2, acpl: 40, accuracy: 75, analyzedAt: new Date() }
        }));
      }
      
      const insights = generateResilienceInsights(games);
      
      // Should have mental score insight at minimum
      expect(insights.length).toBeGreaterThan(0);
    });
  });
});
