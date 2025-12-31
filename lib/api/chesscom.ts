import type {
  Game,
  ChessComArchivesResponse,
  ChessComGamesResponse,
  ChessComGame,
  FetchGamesOptions,
} from '../types';
import { mapChessComResult, mapTimeClass, parseOpeningFromPgn } from '../utils';

const BASE_URL = 'https://api.chess.com/pub';

// Validate that a Chess.com user exists
export async function validateChessComUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/player/${username.toLowerCase()}`);
    return response.ok;
  } catch {
    return false;
  }
}

// Fetch game archives list for a user
async function fetchArchives(username: string): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/player/${username.toLowerCase()}/games/archives`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch archives: ${response.status}`);
  }
  
  const data: ChessComArchivesResponse = await response.json();
  return data.archives;
}

// Fetch games from a single archive URL
async function fetchArchiveGames(archiveUrl: string): Promise<ChessComGame[]> {
  const response = await fetch(archiveUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch archive: ${response.status}`);
  }
  
  const data: ChessComGamesResponse = await response.json();
  return data.games || [];
}

// Convert a Chess.com game to our unified Game type
function convertChessComGame(game: ChessComGame, username: string): Game {
  const normalizedUsername = username.toLowerCase();
  const isWhite = game.white.username.toLowerCase() === normalizedUsername;
  const playerColor = isWhite ? 'white' : 'black';
  const player = isWhite ? game.white : game.black;
  const opponent = isWhite ? game.black : game.white;
  
  // Determine result from the player's perspective
  const result = mapChessComResult(player.result);
  
  // Parse opening from PGN
  const opening = parseOpeningFromPgn(game.pgn || '');
  
  // Map time class
  const timeClass = mapTimeClass(game.time_class);
  
  return {
    id: game.url.split('/').pop() || game.url,
    source: 'chesscom',
    playedAt: new Date(game.end_time * 1000),
    timeClass,
    playerColor,
    result,
    opening,
    opponent: {
      username: opponent.username,
      rating: opponent.rating,
    },
    playerRating: player.rating,
  };
}

// Fetch games from Chess.com
export async function fetchChessComGames(
  username: string,
  options: FetchGamesOptions = {}
): Promise<Game[]> {
  const { maxGames = 100, startDate, endDate } = options;
  
  // Get all archives
  const archives = await fetchArchives(username);
  
  if (archives.length === 0) {
    return [];
  }
  
  // Fetch archives in reverse order (most recent first) until we have enough games
  const reversedArchives = [...archives].reverse();
  const allGames: Game[] = [];
  
  for (const archiveUrl of reversedArchives) {
    // Check if we have enough games
    if (allGames.length >= maxGames) {
      break;
    }
    
    // Check if archive is within date range (rough check based on URL)
    // URL format: https://api.chess.com/pub/player/{user}/games/{YYYY}/{MM}
    if (startDate || endDate) {
      const urlParts = archiveUrl.split('/');
      const year = parseInt(urlParts[urlParts.length - 2]);
      const month = parseInt(urlParts[urlParts.length - 1]);
      const archiveDate = new Date(year, month - 1);
      
      if (endDate && archiveDate > endDate) {
        continue; // Skip future archives
      }
      
      // Create end of month date for comparison
      const archiveEndDate = new Date(year, month, 0);
      if (startDate && archiveEndDate < startDate) {
        break; // Stop if we've gone past the start date
      }
    }
    
    try {
      const games = await fetchArchiveGames(archiveUrl);
      
      // Convert games and filter by date if needed
      for (const game of games.reverse()) { // Reverse to get newest first
        const converted = convertChessComGame(game, username);
        
        // Apply date filters
        if (startDate && converted.playedAt < startDate) continue;
        if (endDate && converted.playedAt > endDate) continue;
        
        allGames.push(converted);
        
        if (allGames.length >= maxGames) {
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch archive ${archiveUrl}:`, error);
      // Continue with other archives
    }
  }
  
  // Sort by date descending
  return allGames.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
}
