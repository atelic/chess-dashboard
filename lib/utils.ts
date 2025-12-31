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
  GameSource,
  DateStats,
  TimeStats,
  TimeClassTimeStats,
  TimePressureStats,
  TimeUsageByPhase,
  HourlyStats,
  DayOfWeekStats,
  TimeWindow,
  TimeHeatmapCell,
} from './types';

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
  if (normalized === 'rapid') return 'rapid';
  if (normalized === 'classical' || normalized === 'standard' || normalized === 'correspondence') return 'classical';
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

export function calculateRatingProgression(games: Game[]): RatingDataPoint[] {
  if (games.length === 0) return [];

  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  return sorted.map((game) => ({
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

  const { min, size } = calculateDynamicBrackets(games);
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
  return date.toISOString().split('T')[0]; // "2025-12-25"
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
