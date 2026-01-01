import { http, HttpResponse } from 'msw';
import {
  chessComPlayerResponse,
  chessComArchivesResponse,
  chessComGamesResponse,
  chessComEmptyArchivesResponse,
  chessComEmptyGamesResponse,
  lichessUserResponse,
  lichessGamesNdjson,
  lichessEmptyGamesNdjson,
  lichessGameWithAnalysis,
  lichessGameWithoutAnalysis,
  lichessCloudEvalResponse,
} from '../fixtures/api-responses';

export const handlers = [
  // ============================================
  // CHESS.COM HANDLERS
  // ============================================

  // User validation
  http.get('https://api.chess.com/pub/player/:username', ({ params }) => {
    const { username } = params;

    // Invalid user
    if (username === 'invaliduser' || username === 'notfound') {
      return new HttpResponse(null, { status: 404 });
    }

    // Rate limited user
    if (username === 'ratelimited') {
      return new HttpResponse(null, { status: 429 });
    }

    // Server error
    if (username === 'servererror') {
      return new HttpResponse(null, { status: 500 });
    }

    // Valid user
    return HttpResponse.json({
      ...chessComPlayerResponse,
      username: username as string,
    });
  }),

  // Game archives list
  http.get('https://api.chess.com/pub/player/:username/games/archives', ({ params }) => {
    const { username } = params;

    if (username === 'invaliduser') {
      return new HttpResponse(null, { status: 404 });
    }

    if (username === 'ratelimited') {
      return new HttpResponse(null, { status: 429 });
    }

    if (username === 'servererror') {
      return new HttpResponse(null, { status: 500 });
    }

    if (username === 'emptygames' || username === 'newuser') {
      return HttpResponse.json(chessComEmptyArchivesResponse);
    }

    return HttpResponse.json(chessComArchivesResponse);
  }),

  // Monthly games archive
  http.get('https://api.chess.com/pub/player/:username/games/:year/:month', ({ params }) => {
    const { username } = params;

    if (username === 'ratelimited') {
      return new HttpResponse(null, { status: 429 });
    }

    if (username === 'servererror') {
      return new HttpResponse(null, { status: 500 });
    }

    if (username === 'emptygames') {
      return HttpResponse.json(chessComEmptyGamesResponse);
    }

    return HttpResponse.json(chessComGamesResponse);
  }),

  // ============================================
  // LICHESS HANDLERS
  // ============================================

  // User validation
  http.get('https://lichess.org/api/user/:username', ({ params }) => {
    const { username } = params;

    if (username === 'invaliduser' || username === 'notfound') {
      return new HttpResponse(null, { status: 404 });
    }

    if (username === 'ratelimited') {
      return new HttpResponse(null, { status: 429 });
    }

    if (username === 'servererror') {
      return new HttpResponse(null, { status: 500 });
    }

    return HttpResponse.json({
      ...lichessUserResponse,
      id: (username as string).toLowerCase(),
      username: username as string,
    });
  }),

  // Games export (NDJSON stream)
  http.get('https://lichess.org/api/games/user/:username', ({ params }) => {
    const { username } = params;

    if (username === 'invaliduser') {
      return new HttpResponse(null, { status: 404 });
    }

    if (username === 'ratelimited') {
      return new HttpResponse(null, { status: 429 });
    }

    if (username === 'servererror') {
      return new HttpResponse(null, { status: 500 });
    }

    if (username === 'emptygames' || username === 'newuser') {
      return new HttpResponse(lichessEmptyGamesNdjson, {
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    }

    return new HttpResponse(lichessGamesNdjson, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }),

  // Single game export (for analysis)
  http.get('https://lichess.org/game/export/:gameId', ({ params }) => {
    const { gameId } = params;

    if (gameId === 'notfound') {
      return new HttpResponse(null, { status: 404 });
    }

    if (gameId === 'noanalysis' || gameId === 'noanalysis123') {
      return HttpResponse.json(lichessGameWithoutAnalysis);
    }

    return HttpResponse.json({
      ...lichessGameWithAnalysis,
      id: gameId,
    });
  }),

  // Cloud evaluation
  http.get('https://lichess.org/api/cloud-eval', ({ request }) => {
    const url = new URL(request.url);
    const fen = url.searchParams.get('fen');

    // Return not found for specific test case
    if (fen?.includes('notfound')) {
      return HttpResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    return HttpResponse.json(lichessCloudEvalResponse);
  }),
];

/**
 * Create handlers that simulate network errors
 */
export function createNetworkErrorHandler(url: string) {
  return http.get(url, () => {
    return HttpResponse.error();
  });
}

/**
 * Create handlers that simulate slow responses
 */
export function createSlowHandler(url: string, delayMs: number) {
  return http.get(url, async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return HttpResponse.json({});
  });
}
