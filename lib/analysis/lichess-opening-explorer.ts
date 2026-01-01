/**
 * Lichess Opening Explorer API Client
 * 
 * Uses Lichess's opening database to check if moves are "book moves" and
 * find when players deviate from known theory.
 * 
 * API Docs: https://lichess.org/api#tag/Opening-Explorer
 */

const MASTERS_DB_URL = 'https://explorer.lichess.ovh/masters';
const LICHESS_DB_URL = 'https://explorer.lichess.ovh/lichess';

/**
 * A move in the opening database with statistics
 */
export interface ExplorerMove {
  /** UCI notation (e.g., "e2e4") */
  uci: string;
  /** SAN notation (e.g., "e4") */
  san: string;
  /** Number of games with this move as white */
  white: number;
  /** Number of draws */
  draws: number;
  /** Number of games with this move as black */
  black: number;
  /** Average rating of players who played this move */
  averageRating?: number;
}

/**
 * Response from the Opening Explorer API
 */
export interface ExplorerResponse {
  /** Total games with white winning */
  white: number;
  /** Total draws */
  draws: number;
  /** Total games with black winning */
  black: number;
  /** Available moves from this position */
  moves: ExplorerMove[];
  /** Top games (in masters database) */
  topGames?: ExplorerTopGame[];
  /** Recent games (in lichess database) */
  recentGames?: ExplorerRecentGame[];
  /** Opening information if available */
  opening?: {
    eco: string;
    name: string;
  };
}

export interface ExplorerTopGame {
  id: string;
  winner: 'white' | 'black' | null;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  year: number;
}

export interface ExplorerRecentGame {
  id: string;
  winner: 'white' | 'black' | null;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  speed: string;
}

/**
 * Options for querying the opening explorer
 */
export interface ExplorerOptions {
  /** Use masters database (default: false, uses lichess database) */
  masters?: boolean;
  /** Ratings to include (for Lichess DB), e.g., [1600, 1800, 2000] */
  ratings?: number[];
  /** Speeds to include (for Lichess DB), e.g., ['blitz', 'rapid'] */
  speeds?: string[];
  /** Number of top games to return */
  topGames?: number;
  /** Number of recent games to return */
  recentGames?: number;
}

/**
 * Opening depth information for a single game
 */
export interface OpeningDepthInfo {
  /** Number of moves that matched the opening database */
  bookMoves: number;
  /** Total moves in the game */
  totalMoves: number;
  /** The move number where player went "out of book" */
  outOfBookMove: number | null;
  /** The player's first non-book move (SAN notation) */
  firstNonBookMove: string | null;
  /** What the book move would have been */
  bookAlternative: string | null;
  /** ECO code at deviation point */
  ecoAtDeviation: string | null;
  /** Opening name at deviation point */
  openingNameAtDeviation: string | null;
}

/**
 * Cache for opening explorer requests
 */
const explorerCache = new Map<string, { data: ExplorerResponse; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Fetch opening data for a position
 * 
 * @param fen - FEN string of the position (only the position part is used)
 * @param options - Query options
 * @returns Opening explorer response or null if request failed
 */
export async function getOpeningData(
  fen: string,
  options: ExplorerOptions = {}
): Promise<ExplorerResponse | null> {
  const { masters = false, ratings, speeds, topGames = 0, recentGames = 0 } = options;
  
  // Build cache key
  const cacheKey = `${fen}:${masters}:${ratings?.join(',')}:${speeds?.join(',')}`;
  
  // Check cache
  const cached = explorerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const baseUrl = masters ? MASTERS_DB_URL : LICHESS_DB_URL;
    const params = new URLSearchParams({ fen });
    
    if (!masters) {
      if (ratings && ratings.length > 0) {
        params.set('ratings', ratings.join(','));
      }
      if (speeds && speeds.length > 0) {
        params.set('speeds', speeds.join(','));
      }
    }
    
    if (topGames > 0) {
      params.set('topGames', topGames.toString());
    }
    if (recentGames > 0) {
      params.set('recentGames', recentGames.toString());
    }

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error(`Opening explorer failed: ${response.status}`);
      return null;
    }

    const data: ExplorerResponse = await response.json();
    
    // Cache the result
    explorerCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    console.error('Opening explorer error:', error);
    return null;
  }
}

/**
 * Check if a move is a "book move" (appears in the database)
 * 
 * @param fen - Position before the move
 * @param move - Move in UCI or SAN notation
 * @param options - Query options
 * @returns true if the move is in the opening database
 */
export async function isBookMove(
  fen: string,
  move: string,
  options: ExplorerOptions = {}
): Promise<boolean> {
  const data = await getOpeningData(fen, options);
  if (!data) return false;

  // Normalize move format (UCI or SAN)
  const normalizedMove = move.toLowerCase().replace(/[+#x]/g, '');
  
  return data.moves.some(m => 
    m.uci.toLowerCase() === normalizedMove ||
    m.san.toLowerCase().replace(/[+#x]/g, '') === normalizedMove
  );
}

/**
 * Get the most popular book moves for a position
 * 
 * @param fen - Position FEN
 * @param options - Query options
 * @returns Array of moves sorted by popularity
 */
export async function getPopularMoves(
  fen: string,
  options: ExplorerOptions = {}
): Promise<ExplorerMove[]> {
  const data = await getOpeningData(fen, options);
  if (!data) return [];

  // Sort by total games (white + black + draws)
  return [...data.moves].sort((a, b) => {
    const totalA = a.white + a.draws + a.black;
    const totalB = b.white + b.draws + b.black;
    return totalB - totalA;
  });
}

/**
 * Calculate opening depth for a sequence of moves
 * Determines how many moves were "book moves" and when the player deviated
 * 
 * @param fens - Array of FEN positions from the game
 * @param moves - Array of moves in UCI notation
 * @param playerColor - Which color the player was
 * @param options - Query options
 * @returns Opening depth information
 */
export async function calculateOpeningDepth(
  fens: string[],
  moves: string[],
  playerColor: 'white' | 'black',
  options: ExplorerOptions = {}
): Promise<OpeningDepthInfo> {
  let bookMoves = 0;
  let outOfBookMove: number | null = null;
  let firstNonBookMove: string | null = null;
  let bookAlternative: string | null = null;
  let ecoAtDeviation: string | null = null;
  let openingNameAtDeviation: string | null = null;

  // Analyze each move until we find the first non-book move
  for (let i = 0; i < Math.min(fens.length, moves.length, 30); i++) {
    const isPlayerMove = (i % 2 === 0 && playerColor === 'white') ||
                        (i % 2 === 1 && playerColor === 'black');

    const data = await getOpeningData(fens[i], options);
    
    if (!data || data.moves.length === 0) {
      // No book data for this position
      if (isPlayerMove && outOfBookMove === null) {
        outOfBookMove = Math.floor(i / 2) + 1;
        // The move at index i is the first non-book move for the player
        firstNonBookMove = moves[i] || null;
      }
      break;
    }

    // Check if the actual move played is in the book
    const moveUci = moves[i];
    const isBook = data.moves.some(m => m.uci === moveUci);

    if (isBook) {
      bookMoves++;
    } else if (isPlayerMove && outOfBookMove === null) {
      // Player deviated from book
      outOfBookMove = Math.floor(i / 2) + 1;
      firstNonBookMove = moveUci;
      
      // Get the top book move as alternative
      if (data.moves.length > 0) {
        const topMove = data.moves.reduce((best, m) => {
          const totalBest = best.white + best.draws + best.black;
          const totalM = m.white + m.draws + m.black;
          return totalM > totalBest ? m : best;
        }, data.moves[0]);
        bookAlternative = topMove.san;
      }
      
      // Record opening info at deviation
      ecoAtDeviation = data.opening?.eco || null;
      openingNameAtDeviation = data.opening?.name || null;
      break;
    } else if (!isPlayerMove && !isBook) {
      // Opponent went out of book, but we continue counting
      // until player's first non-book move
      continue;
    }
  }

  return {
    bookMoves,
    totalMoves: moves.length,
    outOfBookMove,
    firstNonBookMove,
    bookAlternative,
    ecoAtDeviation,
    openingNameAtDeviation,
  };
}

/**
 * Get the win rate for the current side to move
 * 
 * @param data - Explorer response
 * @param sideToMove - 'white' or 'black'
 * @returns Win rate as a percentage (0-100)
 */
export function getWinRate(data: ExplorerResponse, sideToMove: 'white' | 'black'): number {
  const total = data.white + data.draws + data.black;
  if (total === 0) return 50;

  if (sideToMove === 'white') {
    return (data.white / total) * 100;
  } else {
    return (data.black / total) * 100;
  }
}

/**
 * Get the draw rate for a position
 * 
 * @param data - Explorer response
 * @returns Draw rate as a percentage (0-100)
 */
export function getDrawRate(data: ExplorerResponse): number {
  const total = data.white + data.draws + data.black;
  if (total === 0) return 0;
  return (data.draws / total) * 100;
}

/**
 * Format total games for display
 */
export function formatGameCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Clear the explorer cache
 */
export function clearExplorerCache(): void {
  explorerCache.clear();
}
