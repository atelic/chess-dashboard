import type {
  Game,
  GameResult,
  TimeClass,
  PlayerColor,
  TerminationType,
  UserStats,
  WinRateDataPoint,
  OpeningDataPoint,
  RatingDataPoint,
  TimeControlDataPoint,
  ColorPerformanceDataPoint,
  OpeningByColorStats,
  OpponentStats,
  RatingBracketStats,
  StreakInfo,
  TerminationStats,
  Insight,
  FilterState,
  DateStats,
  TimeStats,
  TimeClassTimeStats,
  TimePressureStats,
  TimeUsageByPhase,
  HourlyStats,
  DayOfWeekStats,
  TimeWindow,
  TimeHeatmapCell,
  // Phase 6-8 types
  GamePhase,
  GamePhaseStats,
  PhasePerformanceSummary,
  ResilienceStats,
  GameResilience,
  StudyRecommendation,
} from '../types';

// ============================================
// EXCLUDED OPENINGS
// ============================================

// ECO codes to exclude from opening analysis (too generic/not useful)
const EXCLUDED_ECO_CODES = ['C50'];

// ============================================
// RESULT & TIME CLASS MAPPING
// ============================================

// Chess.com result codes mapping
const CHESSCOM_WIN_RESULTS = ['win'];
const CHESSCOM_LOSS_RESULTS = [
  'checkmated',
  'timeout',
  'resigned',
  'lose',
  'abandoned',
  'kingofthehill',
  'threecheck',
  'bughousepartnerlose',
];
const CHESSCOM_DRAW_RESULTS = [
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
];

export function mapChessComResult(result: string): GameResult {
  if (CHESSCOM_WIN_RESULTS.includes(result)) return 'win';
  if (CHESSCOM_LOSS_RESULTS.includes(result)) return 'loss';
  if (CHESSCOM_DRAW_RESULTS.includes(result)) return 'draw';
  return 'draw';
}

export function mapTimeClass(timeClass: string): TimeClass {
  const normalized = timeClass.toLowerCase();
  if (normalized === 'bullet' || normalized === 'ultrabullet') return 'bullet';
  if (normalized === 'blitz') return 'blitz';
  if (normalized === 'rapid' || normalized === 'correspondence') return 'rapid';
  if (normalized === 'classical' || normalized === 'standard') return 'classical';
  return 'blitz';
}

// ============================================
// PGN PARSING
// ============================================

export function parseOpeningFromPgn(pgn: string): { eco: string; name: string } {
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);
  
  return {
    eco: ecoMatch?.[1] || 'Unknown',
    name: openingMatch?.[1] || 'Unknown Opening',
  };
}

// ============================================
// DATE HELPERS
// ============================================

export function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ============================================
// BASIC STATS CALCULATIONS
// ============================================

export function calculateStats(games: Game[]): UserStats {
  const wins = games.filter((g) => g.result === 'win').length;
  const losses = games.filter((g) => g.result === 'loss').length;
  const draws = games.filter((g) => g.result === 'draw').length;
  const total = games.length;

  return {
    totalGames: total,
    wins,
    losses,
    draws,
    winRate: total > 0 ? (wins / total) * 100 : 0,
  };
}

export function calculateWinRateOverTime(games: Game[]): WinRateDataPoint[] {
  if (games.length === 0) return [];

  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
  const weekMap = new Map<string, { wins: number; losses: number; draws: number }>();

  for (const game of sorted) {
    const week = getWeekString(game.playedAt);
    const current = weekMap.get(week) || { wins: 0, losses: 0, draws: 0 };

    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;

    weekMap.set(week, current);
  }

  const result: WinRateDataPoint[] = [];
  for (const [week, data] of weekMap) {
    const total = data.wins + data.losses + data.draws;
    result.push({
      week,
      winRate: total > 0 ? (data.wins / total) * 100 : 0,
      games: total,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
    });
  }

  return result;
}

export function calculateOpeningStats(games: Game[]): OpeningDataPoint[] {
  const ecoMap = new Map<string, { name: string; wins: number; losses: number; draws: number }>();

  for (const game of games) {
    const eco = game.opening.eco;
    
    // Skip unknown openings
    if (eco === 'Unknown' || game.opening.name === 'Unknown Opening') continue;
    
    const current = ecoMap.get(eco) || { name: game.opening.name, wins: 0, losses: 0, draws: 0 };

    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;

    ecoMap.set(eco, current);
  }

  const result: OpeningDataPoint[] = [];
  for (const [eco, data] of ecoMap) {
    // Skip excluded ECO codes
    if (EXCLUDED_ECO_CODES.includes(eco)) continue;
    
    const total = data.wins + data.losses + data.draws;
    result.push({
      eco,
      name: data.name,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      total,
    });
  }

  return result.sort((a, b) => b.total - a.total).slice(0, 10);
}

export interface RatingProgressionOptions {
  excludeProvisional?: boolean;
}

export function calculateRatingProgression(
  games: Game[],
  options: RatingProgressionOptions = {}
): RatingDataPoint[] {
  if (games.length === 0) return [];

  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  let gamesToProcess = sorted;

  // When excludeProvisional is true, skip the first game for each source+timeClass combo
  // (the first game has a provisional rating that's not representative)
  if (options.excludeProvisional) {
    const firstGameKeys = new Set<string>();
    gamesToProcess = sorted.filter((game) => {
      const key = `${game.source}-${game.timeClass}`;
      if (!firstGameKeys.has(key)) {
        firstGameKeys.add(key);
        return false; // Skip first game of each source+timeClass
      }
      return true;
    });
  }

  return gamesToProcess.map((game) => ({
    date: formatDate(game.playedAt),
    rating: game.playerRating,
    source: game.source,
    timeClass: game.timeClass,
  }));
}

export function calculateTimeControlDistribution(games: Game[]): TimeControlDataPoint[] {
  const countMap = new Map<TimeClass, number>();

  for (const game of games) {
    countMap.set(game.timeClass, (countMap.get(game.timeClass) || 0) + 1);
  }

  const total = games.length;
  const result: TimeControlDataPoint[] = [];

  const timeClasses: TimeClass[] = ['bullet', 'blitz', 'rapid', 'classical'];
  for (const tc of timeClasses) {
    const count = countMap.get(tc) || 0;
    if (count > 0) {
      result.push({
        timeClass: tc,
        count,
        percentage: (count / total) * 100,
      });
    }
  }

  return result;
}

export function calculateColorPerformance(games: Game[]): ColorPerformanceDataPoint[] {
  const whiteGames = games.filter((g) => g.playerColor === 'white');
  const blackGames = games.filter((g) => g.playerColor === 'black');

  const whiteWins = whiteGames.filter((g) => g.result === 'win').length;
  const blackWins = blackGames.filter((g) => g.result === 'win').length;

  return [
    {
      color: 'white',
      games: whiteGames.length,
      wins: whiteWins,
      winRate: whiteGames.length > 0 ? (whiteWins / whiteGames.length) * 100 : 0,
    },
    {
      color: 'black',
      games: blackGames.length,
      wins: blackWins,
      winRate: blackGames.length > 0 ? (blackWins / blackGames.length) * 100 : 0,
    },
  ];
}

// ============================================
// OPENING ANALYSIS BY COLOR
// ============================================

export function calculateOpeningsByColor(
  games: Game[],
  color: PlayerColor
): OpeningByColorStats[] {
  const colorGames = games.filter((g) => g.playerColor === color);
  const ecoMap = new Map<string, {
    name: string;
    games: number;
    wins: number;
    losses: number;
    draws: number;
    totalOpponentRating: number;
  }>();

  for (const game of colorGames) {
    const eco = game.opening.eco;
    
    // Skip unknown openings
    if (eco === 'Unknown' || game.opening.name === 'Unknown Opening') continue;
    
    const current = ecoMap.get(eco) || {
      name: game.opening.name,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalOpponentRating: 0,
    };

    current.games++;
    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;
    current.totalOpponentRating += game.opponent.rating;

    ecoMap.set(eco, current);
  }

  const result: OpeningByColorStats[] = [];
  for (const [eco, data] of ecoMap) {
    // Skip excluded ECO codes
    if (EXCLUDED_ECO_CODES.includes(eco)) continue;
    
    result.push({
      eco,
      name: data.name,
      color,
      games: data.games,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
      avgOpponentRating: data.games > 0 ? Math.round(data.totalOpponentRating / data.games) : 0,
    });
  }

  return result.sort((a, b) => b.games - a.games);
}

export function findBestOpenings(
  games: Game[],
  color: PlayerColor,
  minGames: number = 3,
  limit: number = 5
): OpeningByColorStats[] {
  const openings = calculateOpeningsByColor(games, color);
  return openings
    .filter((o) => o.games >= minGames && !EXCLUDED_ECO_CODES.includes(o.eco))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);
}

export function findWorstOpenings(
  games: Game[],
  color: PlayerColor,
  minGames: number = 3,
  limit: number = 5
): OpeningByColorStats[] {
  const openings = calculateOpeningsByColor(games, color);
  return openings
    .filter((o) => o.games >= minGames && !EXCLUDED_ECO_CODES.includes(o.eco))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, limit);
}

// ============================================
// OPPONENT ANALYSIS
// ============================================

export function calculateOpponentStats(games: Game[]): OpponentStats[] {
  const opponentMap = new Map<string, {
    games: number;
    wins: number;
    losses: number;
    draws: number;
    totalRating: number;
    lastPlayed: Date;
  }>();

  for (const game of games) {
    const username = game.opponent.username.toLowerCase();
    const current = opponentMap.get(username) || {
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalRating: 0,
      lastPlayed: game.playedAt,
    };

    current.games++;
    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;
    current.totalRating += game.opponent.rating;
    if (game.playedAt > current.lastPlayed) {
      current.lastPlayed = game.playedAt;
    }

    opponentMap.set(username, current);
  }

  const result: OpponentStats[] = [];
  for (const [username, data] of opponentMap) {
    result.push({
      username,
      games: data.games,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
      avgRating: data.games > 0 ? Math.round(data.totalRating / data.games) : 0,
      lastPlayed: data.lastPlayed,
    });
  }

  return result.sort((a, b) => b.games - a.games);
}

export function findNemesis(games: Game[], minGames: number = 2): OpponentStats | null {
  const opponents = calculateOpponentStats(games);
  const nemesisCandidates = opponents
    .filter((o) => o.games >= minGames && o.losses > o.wins)
    .sort((a, b) => {
      // Sort by most losses, then by worst win rate
      if (b.losses !== a.losses) return b.losses - a.losses;
      return a.winRate - b.winRate;
    });

  return nemesisCandidates.length > 0 ? nemesisCandidates[0] : null;
}

export function findFavoriteOpponent(games: Game[], minGames: number = 2): OpponentStats | null {
  const opponents = calculateOpponentStats(games);
  const favorites = opponents
    .filter((o) => o.games >= minGames && o.wins > o.losses)
    .sort((a, b) => {
      // Sort by most wins, then by best win rate
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.winRate - a.winRate;
    });

  return favorites.length > 0 ? favorites[0] : null;
}

export function calculateDynamicBrackets(games: Game[]): { min: number; max: number; size: number } {
  if (games.length === 0) return { min: 0, max: 0, size: 200 };

  const ratings = games.map((g) => g.opponent.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = max - min;

  // Aim for 5-6 brackets
  let size = Math.ceil(range / 5 / 100) * 100; // Round to nearest 100
  if (size < 100) size = 100;
  if (size > 400) size = 400;

  // Round min down to nearest bracket
  const bracketMin = Math.floor(min / size) * size;

  return { min: bracketMin, max, size };
}

export function calculateRatingBrackets(games: Game[]): RatingBracketStats[] {
  if (games.length === 0) return [];

  const { size } = calculateDynamicBrackets(games);
  const brackets = new Map<string, {
    minRating: number;
    maxRating: number;
    games: number;
    wins: number;
    losses: number;
    draws: number;
  }>();

  for (const game of games) {
    const bracketMin = Math.floor(game.opponent.rating / size) * size;
    const bracketMax = bracketMin + size - 1;
    const key = `${bracketMin}-${bracketMax}`;

    const current = brackets.get(key) || {
      minRating: bracketMin,
      maxRating: bracketMax,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    };

    current.games++;
    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;

    brackets.set(key, current);
  }

  const result: RatingBracketStats[] = [];
  for (const [bracket, data] of brackets) {
    result.push({
      bracket,
      minRating: data.minRating,
      maxRating: data.maxRating,
      games: data.games,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    });
  }

  return result.sort((a, b) => a.minRating - b.minRating);
}

// ============================================
// STREAKS
// ============================================

export function calculateCurrentStreak(games: Game[]): StreakInfo | null {
  if (games.length === 0) return null;

  // Games should be sorted by date descending (most recent first)
  const sorted = [...games].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  
  // Skip draws at the start
  let startIdx = 0;
  while (startIdx < sorted.length && sorted[startIdx].result === 'draw') {
    startIdx++;
  }

  if (startIdx >= sorted.length) return null;

  const streakType = sorted[startIdx].result === 'win' ? 'win' : 'loss';
  let count = 0;
  let endIdx = startIdx;

  for (let i = startIdx; i < sorted.length; i++) {
    if (sorted[i].result === streakType) {
      count++;
      endIdx = i;
    } else if (sorted[i].result !== 'draw') {
      break;
    }
  }

  if (count < 2) return null;

  return {
    type: streakType,
    count,
    startDate: sorted[endIdx].playedAt,
    endDate: sorted[startIdx].playedAt,
  };
}

export function findLongestWinStreak(games: Game[]): StreakInfo | null {
  return findLongestStreak(games, 'win');
}

export function findLongestLossStreak(games: Game[]): StreakInfo | null {
  return findLongestStreak(games, 'loss');
}

function findLongestStreak(games: Game[], type: 'win' | 'loss'): StreakInfo | null {
  if (games.length === 0) return null;

  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
  
  let maxStreak: StreakInfo | null = null;
  let currentCount = 0;
  let currentStartIdx = -1;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].result === type) {
      if (currentCount === 0) {
        currentStartIdx = i;
      }
      currentCount++;
    } else if (sorted[i].result !== 'draw') {
      // End of streak (don't count draws as breaking streaks)
      if (currentCount > 0 && (!maxStreak || currentCount > maxStreak.count)) {
        maxStreak = {
          type,
          count: currentCount,
          startDate: sorted[currentStartIdx].playedAt,
          endDate: sorted[i - 1].playedAt,
        };
      }
      currentCount = 0;
    }
  }

  // Check if streak continues to the end
  if (currentCount > 0 && (!maxStreak || currentCount > maxStreak.count)) {
    maxStreak = {
      type,
      count: currentCount,
      startDate: sorted[currentStartIdx].playedAt,
      endDate: sorted[sorted.length - 1].playedAt,
    };
  }

  return maxStreak && maxStreak.count >= 2 ? maxStreak : null;
}

// ============================================
// TERMINATION ANALYSIS
// ============================================

const TERMINATION_LABELS: Record<TerminationType, string> = {
  checkmate: 'Checkmate',
  resignation: 'Resignation',
  timeout: 'Timeout',
  stalemate: 'Stalemate',
  insufficient: 'Insufficient Material',
  repetition: 'Repetition',
  agreement: 'Draw Agreement',
  abandoned: 'Abandoned',
  other: 'Other',
};

export function getTerminationLabel(termination: TerminationType): string {
  return TERMINATION_LABELS[termination] || 'Unknown';
}

export function calculateTerminationStats(games: Game[]): TerminationStats[] {
  const stats = new Map<TerminationType, { asWinner: number; asLoser: number }>();

  for (const game of games) {
    const current = stats.get(game.termination) || { asWinner: 0, asLoser: 0 };
    
    if (game.result === 'win') {
      current.asWinner++;
    } else if (game.result === 'loss') {
      current.asLoser++;
    }
    // Draws count as neither winner nor loser for this stat

    stats.set(game.termination, current);
  }

  const result: TerminationStats[] = [];
  for (const [termination, data] of stats) {
    result.push({
      termination,
      label: getTerminationLabel(termination),
      asWinner: data.asWinner,
      asLoser: data.asLoser,
      total: data.asWinner + data.asLoser,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

// ============================================
// DAILY PERFORMANCE ANALYSIS
// ============================================

function getDateKey(date: Date): string {
  // Use local time components to ensure consistent grouping with display
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // "2025-12-25"
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calculateDateStats(games: Game[]): DateStats[] {
  const dateMap = new Map<string, { date: Date; wins: number; losses: number; draws: number; ratingChange: number }>();

  for (const game of games) {
    const key = getDateKey(game.playedAt);
    const current = dateMap.get(key) || { date: game.playedAt, wins: 0, losses: 0, draws: 0, ratingChange: 0 };

    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;
    
    // Sum up rating changes (handle undefined)
    if (game.ratingChange !== undefined) {
      current.ratingChange += game.ratingChange;
    }

    dateMap.set(key, current);
  }

  const result: DateStats[] = [];
  for (const [dateKey, data] of dateMap) {
    const total = data.wins + data.losses + data.draws;
    const dateGames = games.filter((g) => getDateKey(g.playedAt) === dateKey);
    result.push({
      date: dateKey,
      displayDate: formatDisplayDate(data.date),
      games: total,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: total > 0 ? (data.wins / total) * 100 : 0,
      ratingChange: data.ratingChange,
      hasTilt: detectTiltForGames(dateGames),
    });
  }

  // Sort by date descending (most recent first)
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

function detectTiltForGames(games: Game[], threshold: number = 3): boolean {
  if (games.length < threshold) return false;

  // Sort chronologically (oldest first) to detect consecutive losses in order played
  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  let consecutiveLosses = 0;
  for (const game of sorted) {
    if (game.result === 'loss') {
      consecutiveLosses++;
      if (consecutiveLosses >= threshold) return true;
    } else {
      consecutiveLosses = 0;
    }
  }
  return false;
}

export function getGamesForDate(games: Game[], dateKey: string): Game[] {
  return games
    .filter((game) => getDateKey(game.playedAt) === dateKey)
    .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
}

// ============================================
// INSIGHTS GENERATOR
// ============================================

export function generateInsights(games: Game[]): Insight[] {
  const insights: Insight[] = [];

  if (games.length === 0) return insights;

  // 1. Worst opening as Black
  const worstBlack = findWorstOpenings(games, 'black', 3, 1);
  if (worstBlack.length > 0) {
    const opening = worstBlack[0];
    insights.push({
      id: 'worst-opening-black',
      type: 'negative',
      icon: '📉',
      title: 'Worst Opening as Black',
      description: `${opening.name} (${opening.eco})`,
      value: `${opening.winRate.toFixed(0)}% win rate (${opening.games} games)`,
    });
  }

  // 2. Best opening as White
  const bestWhite = findBestOpenings(games, 'white', 3, 1);
  if (bestWhite.length > 0) {
    const opening = bestWhite[0];
    insights.push({
      id: 'best-opening-white',
      type: 'positive',
      icon: '📈',
      title: 'Best Opening as White',
      description: `${opening.name} (${opening.eco})`,
      value: `${opening.winRate.toFixed(0)}% win rate (${opening.games} games)`,
    });
  }

  // 3. Worst opening as White
  const worstWhite = findWorstOpenings(games, 'white', 3, 1);
  if (worstWhite.length > 0) {
    const opening = worstWhite[0];
    insights.push({
      id: 'worst-opening-white',
      type: 'negative',
      icon: '📉',
      title: 'Worst Opening as White',
      description: `${opening.name} (${opening.eco})`,
      value: `${opening.winRate.toFixed(0)}% win rate (${opening.games} games)`,
    });
  }

  // 4. Best opening as Black
  const bestBlack = findBestOpenings(games, 'black', 3, 1);
  if (bestBlack.length > 0) {
    const opening = bestBlack[0];
    insights.push({
      id: 'best-opening-black',
      type: 'positive',
      icon: '📈',
      title: 'Best Opening as Black',
      description: `${opening.name} (${opening.eco})`,
      value: `${opening.winRate.toFixed(0)}% win rate (${opening.games} games)`,
    });
  }

  // 5. Current streak
  const currentStreak = calculateCurrentStreak(games);
  if (currentStreak) {
    insights.push({
      id: 'current-streak',
      type: currentStreak.type === 'win' ? 'positive' : 'negative',
      icon: currentStreak.type === 'win' ? '🔥' : '❄️',
      title: 'Current Streak',
      description: `${currentStreak.count} ${currentStreak.type}s in a row`,
      value: currentStreak.type === 'win' ? 'Keep it going!' : 'Time to bounce back!',
    });
  }

  // 6. Longest win streak
  const longestWin = findLongestWinStreak(games);
  if (longestWin) {
    insights.push({
      id: 'longest-win-streak',
      type: 'positive',
      icon: '🏆',
      title: 'Best Win Streak',
      description: `${longestWin.count} consecutive wins`,
      value: `${formatDateShort(longestWin.startDate)} - ${formatDateShort(longestWin.endDate)}`,
    });
  }

  // 7. Longest loss streak
  const longestLoss = findLongestLossStreak(games);
  if (longestLoss) {
    insights.push({
      id: 'longest-loss-streak',
      type: 'warning',
      icon: '📊',
      title: 'Worst Loss Streak',
      description: `${longestLoss.count} consecutive losses`,
      value: `${formatDateShort(longestLoss.startDate)} - ${formatDateShort(longestLoss.endDate)}`,
    });
  }

  // 8. Most common win method
  const termStats = calculateTerminationStats(games);
  const winMethods = termStats.filter((t) => t.asWinner > 0).sort((a, b) => b.asWinner - a.asWinner);
  if (winMethods.length > 0) {
    const totalWins = games.filter((g) => g.result === 'win').length;
    const topMethod = winMethods[0];
    const percentage = totalWins > 0 ? ((topMethod.asWinner / totalWins) * 100).toFixed(0) : 0;
    insights.push({
      id: 'win-method',
      type: 'neutral',
      icon: '⚔️',
      title: 'How You Win',
      description: `${topMethod.label} (${percentage}%)`,
      value: `${topMethod.asWinner} of ${totalWins} wins`,
    });
  }

  // 9. Most common loss method
  const lossMethods = termStats.filter((t) => t.asLoser > 0).sort((a, b) => b.asLoser - a.asLoser);
  if (lossMethods.length > 0) {
    const totalLosses = games.filter((g) => g.result === 'loss').length;
    const topMethod = lossMethods[0];
    const percentage = totalLosses > 0 ? ((topMethod.asLoser / totalLosses) * 100).toFixed(0) : 0;
    insights.push({
      id: 'loss-method',
      type: 'neutral',
      icon: '💀',
      title: 'How You Lose',
      description: `${topMethod.label} (${percentage}%)`,
      value: `${topMethod.asLoser} of ${totalLosses} losses`,
    });
  }

  // 10. White vs Black performance
  const colorPerf = calculateColorPerformance(games);
  const white = colorPerf.find((c) => c.color === 'white');
  const black = colorPerf.find((c) => c.color === 'black');
  if (white && black && white.games > 0 && black.games > 0) {
    const diff = white.winRate - black.winRate;
    if (Math.abs(diff) >= 5) {
      insights.push({
        id: 'color-performance',
        type: diff > 0 ? 'positive' : 'negative',
        icon: diff > 0 ? '⬜' : '⬛',
        title: 'Color Preference',
        description: `You perform ${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'better' : 'worse'} as White`,
        value: `White: ${white.winRate.toFixed(0)}% | Black: ${black.winRate.toFixed(0)}%`,
      });
    }
  }

  // 11. Average game length
  const gamesWithMoves = games.filter((g) => g.moveCount > 0);
  if (gamesWithMoves.length > 0) {
    const avgMoves = gamesWithMoves.reduce((sum, g) => sum + g.moveCount, 0) / gamesWithMoves.length;
    insights.push({
      id: 'avg-game-length',
      type: 'neutral',
      icon: '📏',
      title: 'Average Game Length',
      description: `${Math.round(avgMoves)} moves per game`,
      value: `Based on ${gamesWithMoves.length} games`,
    });
  }

  // 12. Unique opponents
  const opponents = calculateOpponentStats(games);
  insights.push({
    id: 'unique-opponents',
    type: 'neutral',
    icon: '👥',
    title: 'Unique Opponents',
    description: `You've faced ${opponents.length} different players`,
    value: `${games.length} total games`,
  });

  // 13. Performance vs higher-rated
  const higherRated = games.filter((g) => g.opponent.rating > g.playerRating);
  if (higherRated.length >= 5) {
    const wins = higherRated.filter((g) => g.result === 'win').length;
    const winRate = (wins / higherRated.length) * 100;
    insights.push({
      id: 'vs-higher-rated',
      type: winRate >= 40 ? 'positive' : 'neutral',
      icon: '⬆️',
      title: 'vs Higher Rated',
      description: `${winRate.toFixed(0)}% win rate against stronger opponents`,
      value: `${wins} wins in ${higherRated.length} games`,
    });
  }

  // 14. Performance vs lower-rated
  const lowerRated = games.filter((g) => g.opponent.rating < g.playerRating);
  if (lowerRated.length >= 5) {
    const wins = lowerRated.filter((g) => g.result === 'win').length;
    const winRate = (wins / lowerRated.length) * 100;
    insights.push({
      id: 'vs-lower-rated',
      type: winRate < 60 ? 'warning' : 'positive',
      icon: '⬇️',
      title: 'vs Lower Rated',
      description: `${winRate.toFixed(0)}% win rate against weaker opponents`,
      value: `${wins} wins in ${lowerRated.length} games`,
    });
  }

  // 15. Most played opening
  const allOpenings = calculateOpeningStats(games);
  if (allOpenings.length > 0) {
    const mostPlayed = allOpenings[0];
    const percentage = ((mostPlayed.total / games.length) * 100).toFixed(0);
    insights.push({
      id: 'most-played-opening',
      type: 'neutral',
      icon: '♟️',
      title: 'Favorite Opening',
      description: `${mostPlayed.name} (${mostPlayed.eco})`,
      value: `${mostPlayed.total} games (${percentage}% of all games)`,
    });
  }

  // 16. Time management - timeout losses
  const losses = games.filter((g) => g.result === 'loss');
  const timeoutLosses = losses.filter((g) => g.termination === 'timeout');
  if (losses.length >= 5) {
    const timeoutRate = (timeoutLosses.length / losses.length) * 100;
    if (timeoutRate > 20) {
      insights.push({
        id: 'timeout-losses',
        type: 'warning',
        icon: '⏰',
        title: 'Timeout Trouble',
        description: `${timeoutRate.toFixed(0)}% of your losses are timeouts`,
        value: 'Consider playing with increment or slower time controls',
      });
    }
  }

  // 17. Time pressure performance (requires clock data)
  const gamesWithClock = games.filter((g) => g.clock?.timeRemaining !== undefined);
  if (gamesWithClock.length >= 10) {
    const timeTroubleGames = gamesWithClock.filter((g) => g.clock!.timeRemaining! < 30);
    if (timeTroubleGames.length >= 5) {
      const timeTroubleWins = timeTroubleGames.filter((g) => g.result === 'win');
      const timeTroubleWinRate = (timeTroubleWins.length / timeTroubleGames.length) * 100;
      
      if (timeTroubleWinRate < 30) {
        insights.push({
          id: 'time-pressure',
          type: 'negative',
          icon: '⚡',
          title: 'Struggles Under Time Pressure',
          description: `Only ${timeTroubleWinRate.toFixed(0)}% win rate when low on time`,
          value: 'Practice faster decision-making or manage time better',
        });
      } else if (timeTroubleWinRate > 60) {
        insights.push({
          id: 'time-pressure-clutch',
          type: 'positive',
          icon: '💪',
          title: 'Clutch Under Pressure',
          description: `${timeTroubleWinRate.toFixed(0)}% win rate when low on time`,
          value: 'You handle time pressure well!',
        });
      }
    }
  }

  // 18. Peak performance time (requires sufficient games across time slots)
  const peakTime = findPeakPerformanceTimes(games, 10);
  const worstTime = findWorstPerformanceTimes(games, 10);
  const overallWinRate = games.length > 0 
    ? (games.filter(g => g.result === 'win').length / games.length) * 100 
    : 0;
    
  if (peakTime && peakTime.winRate > overallWinRate + 10) {
    insights.push({
      id: 'peak-time',
      type: 'positive',
      icon: '🌟',
      title: 'Peak Performance Window',
      description: peakTime.label,
      value: `${peakTime.winRate.toFixed(0)}% win rate (${peakTime.games} games)`,
    });
  }
  
  if (worstTime && worstTime.winRate < overallWinRate - 10) {
    insights.push({
      id: 'avoid-time',
      type: 'warning',
      icon: '😴',
      title: 'Consider Avoiding',
      description: worstTime.label,
      value: `Only ${worstTime.winRate.toFixed(0)}% win rate - you may be tired`,
    });
  }

  // 19. Game phase weakness (requires analysis data)
  const phasePerf = calculatePhasePerformance(games);
  if (phasePerf.gamesAnalyzed >= 5) {
    const weakPhase = phasePerf.weakestPhase;
    const weakStats = phasePerf[weakPhase];
    const totalErrors = weakStats.blunders + weakStats.mistakes + weakStats.inaccuracies;
    
    if (totalErrors >= 5) {
      insights.push({
        id: 'weak-phase',
        type: 'warning',
        icon: weakPhase === 'opening' ? '📖' : weakPhase === 'middlegame' ? '⚔️' : '👑',
        title: `${getPhaseLabel(weakPhase)} Weakness`,
        description: `You make the most errors in the ${weakPhase}`,
        value: `${weakStats.blunders} blunders, ${weakStats.mistakes} mistakes`,
      });
    }
  }

  // 20. Add resilience insights
  const resilienceInsights = generateResilienceInsights(games);
  insights.push(...resilienceInsights);

  return insights;
}

// ============================================
// FILTERING
// ============================================

export function getDefaultFilters(): FilterState {
  return {
    dateRange: {},
    maxGames: 0, // 0 means no limit (all games)
    timeClasses: [],
    colors: [],
    results: [],
    openings: [],
    opponentRatingRange: {},
    opponents: [],
    terminations: [],
    sources: [],
    rated: null,
  };
}

export function filterGames(games: Game[], filters: Partial<FilterState>): Game[] {
  // First, sort games by date (newest first)
  const sorted = [...games].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  
  // Apply filters
  let filtered = sorted.filter((game) => {
    // Date range
    if (filters.dateRange?.start && game.playedAt < filters.dateRange.start) return false;
    if (filters.dateRange?.end && game.playedAt > filters.dateRange.end) return false;

    // Time classes
    if (filters.timeClasses && filters.timeClasses.length > 0) {
      if (!filters.timeClasses.includes(game.timeClass)) return false;
    }

    // Colors
    if (filters.colors && filters.colors.length > 0) {
      if (!filters.colors.includes(game.playerColor)) return false;
    }

    // Results
    if (filters.results && filters.results.length > 0) {
      if (!filters.results.includes(game.result)) return false;
    }

    // Openings (ECO codes)
    if (filters.openings && filters.openings.length > 0) {
      if (!filters.openings.includes(game.opening.eco)) return false;
    }

    // Opponent rating range
    if (filters.opponentRatingRange?.min !== undefined) {
      if (game.opponent.rating < filters.opponentRatingRange.min) return false;
    }
    if (filters.opponentRatingRange?.max !== undefined) {
      if (game.opponent.rating > filters.opponentRatingRange.max) return false;
    }

    // Specific opponents
    if (filters.opponents && filters.opponents.length > 0) {
      if (!filters.opponents.includes(game.opponent.username.toLowerCase())) return false;
    }

    // Terminations
    if (filters.terminations && filters.terminations.length > 0) {
      if (!filters.terminations.includes(game.termination)) return false;
    }

    // Sources
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(game.source)) return false;
    }

    // Rated/Unrated
    if (filters.rated !== undefined && filters.rated !== null) {
      if (game.rated !== filters.rated) return false;
    }

    return true;
  });

  // Apply maxGames limit (after filtering, take most recent N games)
  // maxGames of 0 or undefined means no limit
  if (filters.maxGames && filters.maxGames > 0 && filtered.length > filters.maxGames) {
    filtered = filtered.slice(0, filters.maxGames);
  }

  return filtered;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getUniqueOpponents(games: Game[]): string[] {
  const opponents = new Set<string>();
  for (const game of games) {
    opponents.add(game.opponent.username);
  }
  return Array.from(opponents).sort();
}

export function getUniqueOpenings(games: Game[]): { eco: string; name: string }[] {
  const openings = new Map<string, string>();
  for (const game of games) {
    // Skip unknown openings
    if (game.opening.eco === 'Unknown' || game.opening.name === 'Unknown Opening') continue;
    
    if (!openings.has(game.opening.eco)) {
      openings.set(game.opening.eco, game.opening.name);
    }
  }
  return Array.from(openings.entries())
    .map(([eco, name]) => ({ eco, name }))
    .sort((a, b) => a.eco.localeCompare(b.eco));
}

export function calculateAverageGameLength(games: Game[]): number {
  const gamesWithMoves = games.filter((g) => g.moveCount > 0);
  if (gamesWithMoves.length === 0) return 0;
  return gamesWithMoves.reduce((sum, g) => sum + g.moveCount, 0) / gamesWithMoves.length;
}

// Legacy filter function (to be removed later)
export function filterGamesByDateRange(
  games: Game[],
  startDate?: Date,
  endDate?: Date
): Game[] {
  return games.filter((game) => {
    if (startDate && game.playedAt < startDate) return false;
    if (endDate && game.playedAt > endDate) return false;
    return true;
  });
}

export function mergeAndSortGames(gamesArrays: Game[][]): Game[] {
  const allGames = gamesArrays.flat();
  return allGames.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
}

// ============================================
// TIME MANAGEMENT ANALYSIS
// ============================================

/**
 * Calculate overall time management statistics
 */
export function calculateTimeStats(games: Game[]): TimeStats {
  // Filter to games that have clock data
  const gamesWithClock = games.filter((g) => g.clock?.initialTime !== undefined);
  
  if (gamesWithClock.length === 0) {
    return {
      avgTimeRemaining: 0,
      timeoutLossRate: 0,
      avgMoveTime: 0,
      gamesWithClockData: 0,
      byTimeClass: [],
    };
  }

  // Calculate overall stats
  let totalTimeRemaining = 0;
  let gamesWithTimeRemaining = 0;
  let totalMoveTime = 0;
  let gamesWithMoveTime = 0;

  for (const game of gamesWithClock) {
    if (game.clock?.timeRemaining !== undefined) {
      totalTimeRemaining += game.clock.timeRemaining;
      gamesWithTimeRemaining++;
    }
    if (game.clock?.avgMoveTime !== undefined) {
      totalMoveTime += game.clock.avgMoveTime;
      gamesWithMoveTime++;
    }
  }

  // Calculate timeout loss rate
  const losses = games.filter((g) => g.result === 'loss');
  const timeoutLosses = losses.filter((g) => g.termination === 'timeout');
  const timeoutLossRate = losses.length > 0 ? (timeoutLosses.length / losses.length) * 100 : 0;

  // Calculate by time class
  const timeClasses: TimeClass[] = ['bullet', 'blitz', 'rapid', 'classical'];
  const byTimeClass: TimeClassTimeStats[] = [];

  for (const tc of timeClasses) {
    const tcGames = gamesWithClock.filter((g) => g.timeClass === tc);
    if (tcGames.length === 0) continue;

    const tcLosses = tcGames.filter((g) => g.result === 'loss');
    const tcTimeouts = tcLosses.filter((g) => g.termination === 'timeout');

    let tcTotalRemaining = 0;
    let tcCountRemaining = 0;
    let tcTotalMoveTime = 0;
    let tcCountMoveTime = 0;

    for (const game of tcGames) {
      if (game.clock?.timeRemaining !== undefined) {
        tcTotalRemaining += game.clock.timeRemaining;
        tcCountRemaining++;
      }
      if (game.clock?.avgMoveTime !== undefined) {
        tcTotalMoveTime += game.clock.avgMoveTime;
        tcCountMoveTime++;
      }
    }

    byTimeClass.push({
      timeClass: tc,
      games: tcGames.length,
      avgTimeRemaining: tcCountRemaining > 0 ? tcTotalRemaining / tcCountRemaining : 0,
      timeoutRate: tcLosses.length > 0 ? (tcTimeouts.length / tcLosses.length) * 100 : 0,
      avgMoveTime: tcCountMoveTime > 0 ? tcTotalMoveTime / tcCountMoveTime : 0,
    });
  }

  return {
    avgTimeRemaining: gamesWithTimeRemaining > 0 ? totalTimeRemaining / gamesWithTimeRemaining : 0,
    timeoutLossRate,
    avgMoveTime: gamesWithMoveTime > 0 ? totalMoveTime / gamesWithMoveTime : 0,
    gamesWithClockData: gamesWithClock.length,
    byTimeClass,
  };
}

/**
 * Analyze time pressure situations
 */
export function analyzeTimePressure(games: Game[], timeTroubleThreshold: number = 30): TimePressureStats {
  const gamesWithClock = games.filter((g) => g.clock?.timeRemaining !== undefined);
  
  if (gamesWithClock.length === 0) {
    return {
      gamesInTimeTrouble: 0,
      winRateInTimeTrouble: 0,
      lossesToTimeout: 0,
      avgTimeWhenLosing: 0,
      avgTimeWhenWinning: 0,
    };
  }

  // Games ending with low time
  const timeTroubleGames = gamesWithClock.filter(
    (g) => g.clock!.timeRemaining !== undefined && g.clock!.timeRemaining < timeTroubleThreshold
  );
  const timeTroubleWins = timeTroubleGames.filter((g) => g.result === 'win');

  // Timeout losses
  const lossesToTimeout = games.filter(
    (g) => g.result === 'loss' && g.termination === 'timeout'
  ).length;

  // Average time when winning vs losing
  const wins = gamesWithClock.filter((g) => g.result === 'win' && g.clock?.timeRemaining !== undefined);
  const losses = gamesWithClock.filter((g) => g.result === 'loss' && g.clock?.timeRemaining !== undefined);

  const avgTimeWhenWinning = wins.length > 0
    ? wins.reduce((sum, g) => sum + (g.clock?.timeRemaining || 0), 0) / wins.length
    : 0;
  const avgTimeWhenLosing = losses.length > 0
    ? losses.reduce((sum, g) => sum + (g.clock?.timeRemaining || 0), 0) / losses.length
    : 0;

  return {
    gamesInTimeTrouble: timeTroubleGames.length,
    winRateInTimeTrouble: timeTroubleGames.length > 0
      ? (timeTroubleWins.length / timeTroubleGames.length) * 100
      : 0,
    lossesToTimeout,
    avgTimeWhenLosing,
    avgTimeWhenWinning,
  };
}

/**
 * Analyze time usage by game phase
 * Requires games with moveTimes data
 */
export function analyzeTimeUsageByPhase(games: Game[]): TimeUsageByPhase {
  const gamesWithMoveTimes = games.filter((g) => g.clock?.moveTimes && g.clock.moveTimes.length > 0);
  
  if (gamesWithMoveTimes.length === 0) {
    return {
      openingAvgTime: 0,
      middlegameAvgTime: 0,
      endgameAvgTime: 0,
    };
  }

  let openingTotal = 0, openingCount = 0;
  let middlegameTotal = 0, middlegameCount = 0;
  let endgameTotal = 0, endgameCount = 0;

  for (const game of gamesWithMoveTimes) {
    const moveTimes = game.clock!.moveTimes!;
    
    for (let i = 0; i < moveTimes.length; i++) {
      const moveNumber = i + 1;
      const time = moveTimes[i];
      
      if (moveNumber <= 15) {
        openingTotal += time;
        openingCount++;
      } else if (moveNumber <= 40) {
        middlegameTotal += time;
        middlegameCount++;
      } else {
        endgameTotal += time;
        endgameCount++;
      }
    }
  }

  return {
    openingAvgTime: openingCount > 0 ? openingTotal / openingCount : 0,
    middlegameAvgTime: middlegameCount > 0 ? middlegameTotal / middlegameCount : 0,
    endgameAvgTime: endgameCount > 0 ? endgameTotal / endgameCount : 0,
  };
}

// ============================================
// TIME-OF-DAY PERFORMANCE ANALYSIS
// ============================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculate performance by hour of day
 */
export function calculateHourlyStats(games: Game[]): HourlyStats[] {
  const hourData = new Map<number, { wins: number; losses: number; draws: number; ratingChange: number }>();

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    hourData.set(h, { wins: 0, losses: 0, draws: 0, ratingChange: 0 });
  }

  for (const game of games) {
    const hour = game.playedAt.getHours();
    const data = hourData.get(hour)!;

    if (game.result === 'win') data.wins++;
    else if (game.result === 'loss') data.losses++;
    else data.draws++;
    
    if (game.ratingChange !== undefined) {
      data.ratingChange += game.ratingChange;
    }
  }

  const result: HourlyStats[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const data = hourData.get(hour)!;
    const total = data.wins + data.losses + data.draws;
    result.push({
      hour,
      games: total,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: total > 0 ? (data.wins / total) * 100 : 0,
      avgRatingChange: total > 0 ? data.ratingChange / total : 0,
    });
  }

  return result;
}

/**
 * Calculate performance by day of week
 */
export function calculateDayOfWeekStats(games: Game[]): DayOfWeekStats[] {
  const dayData = new Map<number, { wins: number; losses: number; draws: number }>();

  // Initialize all days
  for (let d = 0; d < 7; d++) {
    dayData.set(d, { wins: 0, losses: 0, draws: 0 });
  }

  for (const game of games) {
    const day = game.playedAt.getDay();
    const data = dayData.get(day)!;

    if (game.result === 'win') data.wins++;
    else if (game.result === 'loss') data.losses++;
    else data.draws++;
  }

  const result: DayOfWeekStats[] = [];
  for (let day = 0; day < 7; day++) {
    const data = dayData.get(day)!;
    const total = data.wins + data.losses + data.draws;
    result.push({
      day,
      dayName: DAY_NAMES[day],
      games: total,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: total > 0 ? (data.wins / total) * 100 : 0,
    });
  }

  return result;
}

/**
 * Generate heatmap data for time of day analysis
 */
export function calculateTimeHeatmap(games: Game[]): TimeHeatmapCell[] {
  const cellData = new Map<string, { wins: number; losses: number; draws: number }>();

  // Initialize all cells
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cellData.set(`${day}-${hour}`, { wins: 0, losses: 0, draws: 0 });
    }
  }

  for (const game of games) {
    const day = game.playedAt.getDay();
    const hour = game.playedAt.getHours();
    const key = `${day}-${hour}`;
    const data = cellData.get(key)!;

    if (game.result === 'win') data.wins++;
    else if (game.result === 'loss') data.losses++;
    else data.draws++;
  }

  const result: TimeHeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      const data = cellData.get(key)!;
      const total = data.wins + data.losses + data.draws;
      result.push({
        day,
        hour,
        games: total,
        winRate: total > 0 ? (data.wins / total) * 100 : 0,
      });
    }
  }

  return result;
}

/**
 * Find peak performance time window
 */
export function findPeakPerformanceTimes(games: Game[], minGames: number = 10): TimeWindow | null {
  const hourlyStats = calculateHourlyStats(games);
  
  // Find the best consecutive 3-hour window
  let bestWindow: TimeWindow | null = null;
  let bestWinRate = 0;

  for (let startHour = 0; startHour < 24; startHour++) {
    let wins = 0, totalGames = 0;
    
    // Sum up 3 consecutive hours (wrapping around midnight)
    for (let offset = 0; offset < 3; offset++) {
      const hour = (startHour + offset) % 24;
      wins += hourlyStats[hour].wins;
      totalGames += hourlyStats[hour].games;
    }

    if (totalGames >= minGames) {
      const winRate = (wins / totalGames) * 100;
      if (winRate > bestWinRate) {
        bestWinRate = winRate;
        const endHour = (startHour + 3) % 24;
        bestWindow = {
          startHour,
          endHour,
          winRate,
          games: totalGames,
          label: formatHourRange(startHour, endHour),
        };
      }
    }
  }

  return bestWindow;
}

/**
 * Find worst performance time window
 */
export function findWorstPerformanceTimes(games: Game[], minGames: number = 10): TimeWindow | null {
  const hourlyStats = calculateHourlyStats(games);
  
  // Find the worst consecutive 3-hour window
  let worstWindow: TimeWindow | null = null;
  let worstWinRate = 100;

  for (let startHour = 0; startHour < 24; startHour++) {
    let wins = 0, totalGames = 0;
    
    for (let offset = 0; offset < 3; offset++) {
      const hour = (startHour + offset) % 24;
      wins += hourlyStats[hour].wins;
      totalGames += hourlyStats[hour].games;
    }

    if (totalGames >= minGames) {
      const winRate = (wins / totalGames) * 100;
      if (winRate < worstWinRate) {
        worstWinRate = winRate;
        const endHour = (startHour + 3) % 24;
        worstWindow = {
          startHour,
          endHour,
          winRate,
          games: totalGames,
          label: formatHourRange(startHour, endHour),
        };
      }
    }
  }

  return worstWindow;
}

/**
 * Format an hour range for display
 */
function formatHourRange(startHour: number, endHour: number): string {
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h % 12 || 12;
    return `${hour12}${period}`;
  };
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

// ============================================
// GAME PHASE ANALYSIS (Phase 6)
// ============================================

/**
 * Classify a move number into a game phase
 * Opening: moves 1-15 (first 15 moves)
 * Middlegame: moves 16-40
 * Endgame: moves 41+
 */
export function classifyGamePhase(moveNumber: number): GamePhase {
  if (moveNumber <= 15) return 'opening';
  if (moveNumber <= 40) return 'middlegame';
  return 'endgame';
}

/**
 * Get game phase label for display
 */
export function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case 'opening': return 'Opening';
    case 'middlegame': return 'Middlegame';
    case 'endgame': return 'Endgame';
  }
}

/**
 * Calculate performance by game phase from games with analysis data
 * Note: This requires games to have analysis.blunders, analysis.mistakes, etc.
 * For detailed phase breakdown, move-level analysis data would be needed.
 */
export function calculatePhasePerformance(games: Game[]): PhasePerformanceSummary {
  // Filter to games with analysis data
  const analyzedGames = games.filter(g => g.analysis);
  
  if (analyzedGames.length === 0) {
    const emptyStats: GamePhaseStats = {
      phase: 'opening',
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      avgCpLoss: 0,
      movesAnalyzed: 0,
    };
    return {
      opening: { ...emptyStats, phase: 'opening' },
      middlegame: { ...emptyStats, phase: 'middlegame' },
      endgame: { ...emptyStats, phase: 'endgame' },
      weakestPhase: 'middlegame',
      strongestPhase: 'opening',
      gamesAnalyzed: 0,
    };
  }

  // Since we don't have move-by-move phase data, we estimate based on game length
  // Short games (< 25 moves): mostly opening/early middlegame issues
  // Medium games (25-50 moves): middlegame focused
  // Long games (50+ moves): endgame included
  
  const phaseStats = {
    opening: { blunders: 0, mistakes: 0, inaccuracies: 0, cpLossSum: 0, games: 0 },
    middlegame: { blunders: 0, mistakes: 0, inaccuracies: 0, cpLossSum: 0, games: 0 },
    endgame: { blunders: 0, mistakes: 0, inaccuracies: 0, cpLossSum: 0, games: 0 },
  };

  for (const game of analyzedGames) {
    const analysis = game.analysis!;
    const moveCount = game.moveCount;
    
    // Distribute errors based on typical phase lengths
    // Assume errors are uniformly distributed (rough approximation)
    if (moveCount <= 20) {
      // Short game - attribute to opening/middlegame
      phaseStats.opening.blunders += Math.round(analysis.blunders * 0.6);
      phaseStats.opening.mistakes += Math.round(analysis.mistakes * 0.6);
      phaseStats.opening.inaccuracies += Math.round(analysis.inaccuracies * 0.6);
      phaseStats.opening.games++;
      
      phaseStats.middlegame.blunders += Math.round(analysis.blunders * 0.4);
      phaseStats.middlegame.mistakes += Math.round(analysis.mistakes * 0.4);
      phaseStats.middlegame.inaccuracies += Math.round(analysis.inaccuracies * 0.4);
      phaseStats.middlegame.games++;
    } else if (moveCount <= 40) {
      // Medium game - opening/middlegame focused
      phaseStats.opening.blunders += Math.round(analysis.blunders * 0.3);
      phaseStats.opening.mistakes += Math.round(analysis.mistakes * 0.3);
      phaseStats.opening.inaccuracies += Math.round(analysis.inaccuracies * 0.3);
      phaseStats.opening.games++;
      
      phaseStats.middlegame.blunders += Math.round(analysis.blunders * 0.7);
      phaseStats.middlegame.mistakes += Math.round(analysis.mistakes * 0.7);
      phaseStats.middlegame.inaccuracies += Math.round(analysis.inaccuracies * 0.7);
      phaseStats.middlegame.games++;
    } else {
      // Long game - all phases
      phaseStats.opening.blunders += Math.round(analysis.blunders * 0.2);
      phaseStats.opening.mistakes += Math.round(analysis.mistakes * 0.2);
      phaseStats.opening.inaccuracies += Math.round(analysis.inaccuracies * 0.2);
      phaseStats.opening.games++;
      
      phaseStats.middlegame.blunders += Math.round(analysis.blunders * 0.5);
      phaseStats.middlegame.mistakes += Math.round(analysis.mistakes * 0.5);
      phaseStats.middlegame.inaccuracies += Math.round(analysis.inaccuracies * 0.5);
      phaseStats.middlegame.games++;
      
      phaseStats.endgame.blunders += Math.round(analysis.blunders * 0.3);
      phaseStats.endgame.mistakes += Math.round(analysis.mistakes * 0.3);
      phaseStats.endgame.inaccuracies += Math.round(analysis.inaccuracies * 0.3);
      phaseStats.endgame.games++;
    }

    // Track ACPL if available
    if (analysis.acpl !== undefined) {
      phaseStats.opening.cpLossSum += analysis.acpl;
      phaseStats.middlegame.cpLossSum += analysis.acpl;
      if (moveCount > 40) {
        phaseStats.endgame.cpLossSum += analysis.acpl;
      }
    }
  }

  // Build final stats
  const buildStats = (phase: GamePhase, data: typeof phaseStats.opening): GamePhaseStats => ({
    phase,
    blunders: data.blunders,
    mistakes: data.mistakes,
    inaccuracies: data.inaccuracies,
    avgCpLoss: data.games > 0 ? data.cpLossSum / data.games : 0,
    movesAnalyzed: data.games * (phase === 'opening' ? 15 : phase === 'middlegame' ? 25 : 20),
  });

  const opening = buildStats('opening', phaseStats.opening);
  const middlegame = buildStats('middlegame', phaseStats.middlegame);
  const endgame = buildStats('endgame', phaseStats.endgame);

  // Calculate error rate per phase
  const errorRate = (stats: GamePhaseStats) => 
    stats.movesAnalyzed > 0 ? (stats.blunders + stats.mistakes + stats.inaccuracies) / stats.movesAnalyzed : 0;

  const phases: [GamePhase, number][] = [
    ['opening', errorRate(opening)],
    ['middlegame', errorRate(middlegame)],
    ['endgame', errorRate(endgame)],
  ];

  // Filter out phases with no data
  const activePhasesWeak = phases.filter(([phase]) => {
    if (phase === 'opening') return phaseStats.opening.games > 0;
    if (phase === 'middlegame') return phaseStats.middlegame.games > 0;
    return phaseStats.endgame.games > 0;
  });

  const activePhases = activePhasesWeak.length > 0 ? activePhasesWeak : phases;

  phases.sort((a, b) => b[1] - a[1]);
  const weakestPhase = activePhases.length > 0 ? 
    activePhases.reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'middlegame';
  const strongestPhase = activePhases.length > 0 ?
    activePhases.reduce((a, b) => a[1] < b[1] ? a : b)[0] : 'opening';

  return {
    opening,
    middlegame,
    endgame,
    weakestPhase,
    strongestPhase,
    gamesAnalyzed: analyzedGames.length,
  };
}

// ============================================
// RESILIENCE/COMEBACK ANALYSIS (Phase 8)
// ============================================

/**
 * Threshold in centipawns for considering a position "winning"
 */
const WINNING_THRESHOLD = 150;

/**
 * Threshold in centipawns for considering a position "losing"
 */
const LOSING_THRESHOLD = -150;

/**
 * Calculate resilience statistics from games with evaluation data
 * Note: This requires games to have detailed eval data, which may not be available
 * for all games. Falls back to using analysis data if available.
 */
export function calculateResilienceStats(games: Game[]): ResilienceStats {
  // Filter to games with analysis data
  const analyzedGames = games.filter(g => g.analysis);
  
  let comebackWins = 0;
  let blownWins = 0;
  let gamesWhereLosing = 0;
  let gamesWhereWinning = 0;
  let totalDeficitOvercome = 0;
  let totalLeadLost = 0;
  let volatileGames = 0;
  let convertedAdvantages = 0;

  for (const game of analyzedGames) {
    // Use blunder/mistake counts as proxy for eval swings
    const analysis = game.analysis!;
    const errorCount = analysis.blunders + analysis.mistakes;
    
    // Estimate volatility based on error count and game result
    const isVolatile = errorCount >= 3;
    if (isVolatile) volatileGames++;

    // Heuristic: games with many opponent errors where you won = likely comeback
    // games with many player errors where you lost = likely blown win
    if (game.result === 'win') {
      // Check if it's likely a comeback (high error count suggests volatile game)
      if (errorCount >= 2 && analysis.blunders >= 1) {
        // Could be a comeback - opponent may have had advantage
        gamesWhereLosing++;
        comebackWins++;
        totalDeficitOvercome += 100 * errorCount; // Rough estimate
      } else {
        // Clean win - advantage converted
        gamesWhereWinning++;
        convertedAdvantages++;
      }
    } else if (game.result === 'loss') {
      // Check if it's likely a blown win
      if (errorCount >= 2 && analysis.blunders >= 1) {
        gamesWhereWinning++;
        blownWins++;
        totalLeadLost += 100 * errorCount; // Rough estimate
      } else {
        gamesWhereLosing++;
      }
    }
  }

  // Calculate rates
  const comebackRate = gamesWhereLosing > 0 ? (comebackWins / gamesWhereLosing) * 100 : 0;
  const blowRate = gamesWhereWinning > 0 ? (blownWins / gamesWhereWinning) * 100 : 0;
  
  // Mental score: 0-100 based on comeback rate and blow avoidance
  // Higher comeback rate is good, lower blow rate is good
  const mentalScore = Math.min(100, Math.max(0, 
    50 + (comebackRate * 0.3) - (blowRate * 0.5) + 
    (convertedAdvantages / Math.max(1, analyzedGames.length) * 20)
  ));

  return {
    comebackWins,
    blownWins,
    comebackRate,
    blowRate,
    convertedAdvantages,
    avgDeficitOvercome: comebackWins > 0 ? totalDeficitOvercome / comebackWins : 0,
    avgLeadLost: blownWins > 0 ? totalLeadLost / blownWins : 0,
    volatileGames,
    mentalScore: Math.round(mentalScore),
  };
}

/**
 * Classify a game based on resilience patterns
 */
export function classifyGameResilience(
  game: Game,
  maxDeficit: number = 0,
  maxAdvantage: number = 0
): GameResilience {
  const isComeback = game.result === 'win' && maxDeficit < LOSING_THRESHOLD;
  const isBlownWin = game.result === 'loss' && maxAdvantage > WINNING_THRESHOLD;
  
  // Estimate eval swings from analysis if available
  let evalSwings = 0;
  if (game.analysis) {
    // Each blunder is roughly a 200+ cp swing, mistakes are 100-200 cp
    evalSwings = game.analysis.blunders * 2 + game.analysis.mistakes;
  }

  return {
    gameId: game.id,
    maxDeficit,
    maxAdvantage,
    isComeback,
    isBlownWin,
    evalSwings,
    result: game.result,
  };
}

/**
 * Get resilience-related insights
 */
export function generateResilienceInsights(games: Game[]): Insight[] {
  const insights: Insight[] = [];
  const stats = calculateResilienceStats(games);
  
  if (games.filter(g => g.analysis).length < 5) {
    return insights; // Not enough data
  }

  // Mental game score insight
  insights.push({
    id: 'mental-score',
    type: stats.mentalScore >= 60 ? 'positive' : stats.mentalScore >= 40 ? 'neutral' : 'negative',
    icon: stats.mentalScore >= 60 ? '🧠' : stats.mentalScore >= 40 ? '🎯' : '😤',
    title: 'Mental Game Score',
    description: `Your resilience score is ${stats.mentalScore}/100`,
    value: stats.mentalScore >= 60 ? 'Strong mental game!' : 
           stats.mentalScore >= 40 ? 'Room for improvement' : 
           'Work on staying composed',
  });

  // Comeback ability
  if (stats.comebackWins >= 3) {
    insights.push({
      id: 'comeback-ability',
      type: stats.comebackRate >= 30 ? 'positive' : 'neutral',
      icon: '💪',
      title: 'Comeback Ability',
      description: `${stats.comebackWins} wins from losing positions`,
      value: `${stats.comebackRate.toFixed(0)}% comeback rate`,
    });
  }

  // Blown wins warning
  if (stats.blownWins >= 3 && stats.blowRate >= 20) {
    insights.push({
      id: 'blown-wins',
      type: 'warning',
      icon: '📉',
      title: 'Advantage Conversion',
      description: `${stats.blownWins} games lost from winning positions`,
      value: 'Focus on converting advantages carefully',
    });
  }

  // Volatility
  const volatilityRate = games.length > 0 ? (stats.volatileGames / games.length) * 100 : 0;
  if (volatilityRate >= 40) {
    insights.push({
      id: 'volatile-games',
      type: 'warning',
      icon: '🎢',
      title: 'Volatile Play Style',
      description: `${volatilityRate.toFixed(0)}% of games have major swings`,
      value: 'Your games tend to be back-and-forth battles',
    });
  }

  return insights;
}

// ============================================
// RECOMMENDATIONS GENERATOR (Phase 7)
// ============================================

/**
 * Generate personalized study recommendations based on game analysis
 */
export function generateRecommendations(games: Game[]): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];
  
  if (games.length < 10) {
    return recommendations; // Need more games for meaningful recommendations
  }

  // 1. Opening recommendations based on weak openings
  const worstWhite = findWorstOpenings(games, 'white', 3, 3);
  const worstBlack = findWorstOpenings(games, 'black', 3, 3);
  
  const weakOpenings = [...worstWhite, ...worstBlack]
    .filter(o => o.winRate < 40)
    .sort((a, b) => a.winRate - b.winRate);

  if (weakOpenings.length > 0) {
    recommendations.push({
      id: 'weak-openings',
      type: 'opening_study',
      priority: 'high',
      title: 'Study Your Weak Openings',
      description: 'These openings have a significantly below-average win rate for you.',
      studyItems: weakOpenings.slice(0, 3).map(o => `${o.name} (${o.eco})`),
      evidence: `Lowest win rate: ${weakOpenings[0].winRate.toFixed(0)}% in ${weakOpenings[0].games} games`,
      estimatedImpact: 'high',
    });
  }

  // 2. Time control recommendations
  const timeStats = calculateTimeStats(games);
  if (timeStats.timeoutLossRate > 25) {
    recommendations.push({
      id: 'time-management',
      type: 'time_management',
      priority: 'high',
      title: 'Improve Time Management',
      description: 'You lose too many games on time. Practice faster decision-making.',
      studyItems: [
        'Practice with increment (e.g., 3+2)',
        'Pre-move in clear positions',
        'Study faster opening lines',
      ],
      evidence: `${timeStats.timeoutLossRate.toFixed(0)}% of losses are timeouts`,
      estimatedImpact: 'medium',
    });
  }

  // 3. Time control where struggling
  const byTimeClass = timeStats.byTimeClass
    .filter(tc => tc.games >= 5)
    .sort((a, b) => a.timeoutRate - b.timeoutRate);
  
  if (byTimeClass.length > 0 && byTimeClass[byTimeClass.length - 1].timeoutRate > 30) {
    const worst = byTimeClass[byTimeClass.length - 1];
    recommendations.push({
      id: 'time-control-weak',
      type: 'time_control',
      priority: 'medium',
      title: `Struggles in ${worst.timeClass.charAt(0).toUpperCase() + worst.timeClass.slice(1)}`,
      description: `You have a high timeout rate in ${worst.timeClass} games.`,
      studyItems: [
        `Play slower time controls until comfortable`,
        `Practice ${worst.timeClass} specifically`,
        'Work on opening preparation',
      ],
      evidence: `${worst.timeoutRate.toFixed(0)}% timeout rate in ${worst.games} ${worst.timeClass} games`,
      estimatedImpact: 'medium',
    });
  }

  // 4. Game phase recommendations (if analysis data available)
  const phasePerf = calculatePhasePerformance(games);
  if (phasePerf.gamesAnalyzed >= 5) {
    const weakPhase = phasePerf.weakestPhase;
    const weakStats = phasePerf[weakPhase];
    
    if (weakStats.blunders + weakStats.mistakes >= 5) {
      recommendations.push({
        id: 'weak-phase',
        type: weakPhase === 'endgame' ? 'endgame' : 'tactical_pattern',
        priority: 'high',
        title: `Improve Your ${getPhaseLabel(weakPhase)}`,
        description: `You make the most mistakes in the ${weakPhase}.`,
        studyItems: weakPhase === 'endgame' 
          ? ['Study basic endgame patterns', 'Practice king and pawn endgames', 'Learn rook endgames']
          : weakPhase === 'opening'
          ? ['Deepen opening knowledge', 'Study opening principles', 'Learn typical pawn structures']
          : ['Solve tactics puzzles', 'Study middlegame strategy', 'Practice calculation'],
        evidence: `${weakStats.blunders} blunders and ${weakStats.mistakes} mistakes in ${weakPhase}`,
        estimatedImpact: 'high',
      });
    }
  }

  // 5. Mental game recommendations
  const resilienceStats = calculateResilienceStats(games);
  if (resilienceStats.blowRate > 30 && resilienceStats.blownWins >= 3) {
    recommendations.push({
      id: 'mental-game',
      type: 'mental_game',
      priority: 'medium',
      title: 'Work on Converting Advantages',
      description: 'You tend to lose games from winning positions.',
      studyItems: [
        'Practice technique positions',
        'Study prophylaxis',
        'Learn to "not rush" when winning',
      ],
      evidence: `${resilienceStats.blownWins} games lost from winning positions (${resilienceStats.blowRate.toFixed(0)}% blow rate)`,
      estimatedImpact: 'medium',
    });
  }

  // 6. Rating performance recommendations
  const lowerRated = games.filter(g => g.opponent.rating < g.playerRating - 100);
  
  if (lowerRated.length >= 10) {
    const lowerWins = lowerRated.filter(g => g.result === 'win').length;
    const lowerWinRate = (lowerWins / lowerRated.length) * 100;
    
    if (lowerWinRate < 60) {
      recommendations.push({
        id: 'vs-lower-rated',
        type: 'tactical_pattern',
        priority: 'medium',
        title: 'Beat Lower-Rated Players More Consistently',
        description: `Only ${lowerWinRate.toFixed(0)}% win rate against players rated 100+ points below you.`,
        studyItems: [
          'Avoid overconfidence',
          'Play solid, principle-based chess',
          'Take every opponent seriously',
        ],
        evidence: `${lowerWins} wins in ${lowerRated.length} games vs lower-rated`,
        estimatedImpact: 'medium',
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 6); // Limit to top 6 recommendations
}
