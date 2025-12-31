import type { Game, LichessGame, FetchGamesOptions, TerminationType } from '../types';
import { mapTimeClass } from '../utils';

const BASE_URL = 'https://lichess.org/api';

// Validate that a Lichess user exists
export async function validateLichessUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/user/${username}`);
    return response.ok;
  } catch {
    return false;
  }
}

// Parse NDJSON stream
async function parseNdjsonStream(response: Response): Promise<LichessGame[]> {
  const text = await response.text();
  const lines = text.trim().split('\n');
  const games: LichessGame[] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        games.push(JSON.parse(line));
      } catch (e) {
        console.error('Failed to parse Lichess game line:', e);
      }
    }
  }
  
  return games;
}

// Map Lichess status to termination type
function mapLichessTermination(status: string): TerminationType {
  const map: Record<string, TerminationType> = {
    'mate': 'checkmate',
    'resign': 'resignation',
    'outoftime': 'timeout',
    'timeout': 'timeout',
    'stalemate': 'stalemate',
    'draw': 'agreement',
    'aborted': 'abandoned',
    'noStart': 'abandoned',
    'cheat': 'other',
    'variantEnd': 'other',
  };
  return map[status] || 'other';
}

// Count moves from moves string
function countMovesFromString(moves: string | undefined): number {
  if (!moves) return 0;
  
  // Moves are space-separated, each pair is one full move
  const moveList = moves.trim().split(/\s+/);
  // Full moves = total half-moves / 2, rounded up
  return Math.ceil(moveList.length / 2);
}

// Convert a Lichess game to our unified Game type
function convertLichessGame(game: LichessGame, username: string): Game {
  const normalizedUsername = username.toLowerCase();
  const isWhite = game.players.white.user?.id.toLowerCase() === normalizedUsername;
  const playerColor = isWhite ? 'white' : 'black';
  const player = isWhite ? game.players.white : game.players.black;
  const opponent = isWhite ? game.players.black : game.players.white;
  
  // Determine result
  let result: 'win' | 'loss' | 'draw';
  if (game.winner) {
    result = game.winner === playerColor ? 'win' : 'loss';
  } else {
    result = 'draw';
  }
  
  // Map time class (Lichess uses 'speed' field)
  const timeClass = mapTimeClass(game.speed);
  
  // Opening info is directly available
  const opening = {
    eco: game.opening?.eco || 'Unknown',
    name: game.opening?.name || 'Unknown Opening',
  };
  
  // Map termination
  const termination = mapLichessTermination(game.status);
  
  // Count moves
  const moveCount = countMovesFromString(game.moves);
  
  // Get rating change from player data
  const ratingChange = player.ratingDiff;
  
  return {
    id: game.id,
    source: 'lichess',
    playedAt: new Date(game.createdAt),
    timeClass,
    playerColor,
    result,
    opening,
    opponent: {
      username: opponent.user?.name || 'Anonymous',
      rating: opponent.rating,
    },
    playerRating: player.rating,
    termination,
    moveCount,
    ratingChange,
  };
}

// Fetch games from Lichess
export async function fetchLichessGames(
  username: string,
  options: FetchGamesOptions = {}
): Promise<Game[]> {
  const { maxGames = 100, startDate, endDate } = options;
  
  // Build URL with query parameters
  const params = new URLSearchParams({
    max: maxGames.toString(),
    opening: 'true',
    moves: 'true',  // Need moves to count them
  });
  
  // Add date filters if provided (Lichess uses millisecond timestamps)
  if (startDate) {
    params.set('since', startDate.getTime().toString());
  }
  if (endDate) {
    params.set('until', endDate.getTime().toString());
  }
  
  const url = `${BASE_URL}/games/user/${username}?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      Accept: 'application/x-ndjson',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Lichess games: ${response.status}`);
  }
  
  const games = await parseNdjsonStream(response);
  
  // Convert to unified format
  const converted = games.map((game) => convertLichessGame(game, username));
  
  // Sort by date descending
  return converted.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
}
