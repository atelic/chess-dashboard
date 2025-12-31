import type {
  Game,
  GameResult,
  TimeClass,
  UserStats,
  WinRateDataPoint,
  OpeningDataPoint,
  RatingDataPoint,
  TimeControlDataPoint,
  ColorPerformanceDataPoint,
} from './types';

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
  // Default to draw for unknown results
  return 'draw';
}

// Map time class from both platforms to unified type
export function mapTimeClass(timeClass: string): TimeClass {
  const normalized = timeClass.toLowerCase();
  if (normalized === 'bullet') return 'bullet';
  if (normalized === 'blitz') return 'blitz';
  if (normalized === 'rapid') return 'rapid';
  if (normalized === 'classical' || normalized === 'standard') return 'classical';
  // Default to blitz for unknown
  return 'blitz';
}

// Extract ECO code from Chess.com eco URL
// e.g., "https://www.chess.com/openings/Pirc-Defense-Classical..." -> need to parse PGN
// Note: The URL doesn't contain the ECO code directly, so we parse from PGN instead

// Parse ECO and opening name from PGN headers
export function parseOpeningFromPgn(pgn: string): { eco: string; name: string } {
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);
  
  return {
    eco: ecoMatch?.[1] || 'Unknown',
    name: openingMatch?.[1] || 'Unknown Opening',
  };
}

// Get week string from date (ISO week)
export function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Format date for display
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate overall stats from games
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

// Calculate win rate over time (grouped by week)
export function calculateWinRateOverTime(games: Game[]): WinRateDataPoint[] {
  if (games.length === 0) return [];

  // Sort games by date
  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  // Group by week
  const weekMap = new Map<string, { wins: number; losses: number; draws: number }>();

  for (const game of sorted) {
    const week = getWeekString(game.playedAt);
    const current = weekMap.get(week) || { wins: 0, losses: 0, draws: 0 };

    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;

    weekMap.set(week, current);
  }

  // Convert to array
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

// Calculate results by opening (grouped by ECO code)
export function calculateOpeningStats(games: Game[]): OpeningDataPoint[] {
  const ecoMap = new Map<string, { name: string; wins: number; losses: number; draws: number }>();

  for (const game of games) {
    const eco = game.opening.eco;
    const current = ecoMap.get(eco) || { name: game.opening.name, wins: 0, losses: 0, draws: 0 };

    if (game.result === 'win') current.wins++;
    else if (game.result === 'loss') current.losses++;
    else current.draws++;

    // Keep the most common name (first encountered)
    ecoMap.set(eco, current);
  }

  // Convert to array and sort by total games
  const result: OpeningDataPoint[] = [];
  for (const [eco, data] of ecoMap) {
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

  // Sort by total games descending and take top 10
  return result.sort((a, b) => b.total - a.total).slice(0, 10);
}

// Calculate rating progression over time
export function calculateRatingProgression(games: Game[]): RatingDataPoint[] {
  if (games.length === 0) return [];

  // Sort by date
  const sorted = [...games].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  return sorted.map((game) => ({
    date: formatDate(game.playedAt),
    rating: game.playerRating,
    source: game.source,
  }));
}

// Calculate time control distribution
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

// Calculate performance by color
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

// Filter games by date range
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

// Merge and sort games from multiple sources
export function mergeAndSortGames(gamesArrays: Game[][]): Game[] {
  const allGames = gamesArrays.flat();
  // Sort by playedAt descending (most recent first)
  return allGames.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
}
