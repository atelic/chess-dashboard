/**
 * Mock API responses for Chess.com and Lichess
 */

// ============================================
// CHESS.COM API RESPONSES
// ============================================

export const chessComPlayerResponse = {
  player_id: 12345,
  '@id': 'https://api.chess.com/pub/player/testuser',
  url: 'https://www.chess.com/member/testuser',
  username: 'testuser',
  followers: 100,
  country: 'https://api.chess.com/pub/country/US',
  joined: 1609459200,
  status: 'premium',
  is_streamer: false,
};

export const chessComArchivesResponse = {
  archives: [
    'https://api.chess.com/pub/player/testuser/games/2024/06',
    'https://api.chess.com/pub/player/testuser/games/2024/05',
    'https://api.chess.com/pub/player/testuser/games/2024/04',
  ],
};

export const chessComEmptyArchivesResponse = {
  archives: [],
};

export const chessComGamesResponse = {
  games: [
    {
      url: 'https://www.chess.com/game/live/123456',
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.06.15"]
[Round "-"]
[White "testuser"]
[Black "opponent123"]
[Result "1-0"]
[ECO "B20"]
[Opening "Sicilian Defense"]
[WhiteElo "1550"]
[BlackElo "1500"]
[TimeControl "180"]
[EndTime "10:35:00 PDT"]
[Termination "testuser won by checkmate"]

1. e4 {[%clk 0:02:58]} c5 {[%clk 0:02:55]} 2. Nf3 {[%clk 0:02:50]} d6 {[%clk 0:02:48]} 3. d4 {[%clk 0:02:45]} 1-0`,
      time_control: '180',
      end_time: 1718445600,
      rated: true,
      accuracies: {
        white: 92.5,
        black: 78.3,
      },
      time_class: 'blitz',
      rules: 'chess',
      white: {
        rating: 1550,
        result: 'win',
        '@id': 'https://api.chess.com/pub/player/testuser',
        username: 'testuser',
        uuid: 'user-uuid-1',
      },
      black: {
        rating: 1500,
        result: 'checkmated',
        '@id': 'https://api.chess.com/pub/player/opponent123',
        username: 'opponent123',
        uuid: 'user-uuid-2',
      },
    },
    {
      url: 'https://www.chess.com/game/live/123457',
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.06.15"]
[Round "-"]
[White "opponent456"]
[Black "testuser"]
[Result "1-0"]
[ECO "C50"]
[Opening "Italian Game"]
[WhiteElo "1600"]
[BlackElo "1545"]
[TimeControl "180+2"]
[EndTime "11:20:00 PDT"]
[Termination "opponent456 won by resignation"]

1. e4 {[%clk 0:02:58]} e5 {[%clk 0:02:55]} 2. Nf3 {[%clk 0:02:50]} Nc6 {[%clk 0:02:48]} 3. Bc4 {[%clk 0:02:45]} 1-0`,
      time_control: '180+2',
      end_time: 1718448000,
      rated: true,
      time_class: 'blitz',
      rules: 'chess',
      white: {
        rating: 1600,
        result: 'win',
        '@id': 'https://api.chess.com/pub/player/opponent456',
        username: 'opponent456',
        uuid: 'user-uuid-3',
      },
      black: {
        rating: 1545,
        result: 'resigned',
        '@id': 'https://api.chess.com/pub/player/testuser',
        username: 'testuser',
        uuid: 'user-uuid-1',
      },
    },
  ],
};

export const chessComEmptyGamesResponse = {
  games: [],
};

// ============================================
// LICHESS API RESPONSES
// ============================================

export const lichessUserResponse = {
  id: 'testuser',
  username: 'TestUser',
  perfs: {
    blitz: { games: 1000, rating: 1550, rd: 45, prog: 10 },
    rapid: { games: 500, rating: 1600, rd: 50, prog: -5 },
    bullet: { games: 200, rating: 1400, rd: 60, prog: 15 },
  },
  createdAt: 1609459200000,
  seenAt: 1718445600000,
  playTime: { total: 500000, tv: 1000 },
  count: { all: 1700, rated: 1500 },
};

// NDJSON format - each line is a separate JSON object
export const lichessGamesNdjson = `{"id":"abc123","rated":true,"variant":"standard","speed":"blitz","perf":"blitz","createdAt":1718445600000,"lastMoveAt":1718445900000,"status":"mate","players":{"white":{"user":{"name":"TestUser","id":"testuser"},"rating":1550,"ratingDiff":8},"black":{"user":{"name":"Opponent123","id":"opponent123"},"rating":1500,"ratingDiff":-8}},"winner":"white","opening":{"eco":"B20","name":"Sicilian Defense","ply":4},"moves":"e4 c5 Nf3 d6 d4","clock":{"initial":180,"increment":0,"totalTime":180},"clocks":[18000,18000,17500,17800,17000,17500]}
{"id":"def456","rated":true,"variant":"standard","speed":"blitz","perf":"blitz","createdAt":1718442000000,"lastMoveAt":1718442300000,"status":"resign","players":{"white":{"user":{"name":"Opponent456","id":"opponent456"},"rating":1600,"ratingDiff":8},"black":{"user":{"name":"TestUser","id":"testuser"},"rating":1545,"ratingDiff":-8}},"winner":"white","opening":{"eco":"C50","name":"Italian Game","ply":6},"moves":"e4 e5 Nf3 Nc6 Bc4 Nf6","clock":{"initial":180,"increment":2,"totalTime":300},"clocks":[18000,18000,17800,17900,17600,17700]}
{"id":"ghi789","rated":true,"variant":"standard","speed":"rapid","perf":"rapid","createdAt":1718438400000,"lastMoveAt":1718439600000,"status":"draw","players":{"white":{"user":{"name":"TestUser","id":"testuser"},"rating":1600},"black":{"user":{"name":"Opponent789","id":"opponent789"},"rating":1580}},"opening":{"eco":"D00","name":"Queen's Pawn Game","ply":2},"moves":"d4 d5","clock":{"initial":600,"increment":0,"totalTime":600}}`;

export const lichessEmptyGamesNdjson = '';

// Single game with analysis data
export const lichessGameWithAnalysis = {
  id: 'analyzed123',
  rated: true,
  variant: 'standard',
  speed: 'blitz',
  perf: 'blitz',
  createdAt: 1718445600000,
  lastMoveAt: 1718445900000,
  status: 'mate',
  players: {
    white: {
      user: { name: 'TestUser', id: 'testuser' },
      rating: 1550,
      ratingDiff: 8,
      analysis: {
        inaccuracy: 5,
        mistake: 3,
        blunder: 2,
        acpl: 32,
        accuracy: 85,
      },
    },
    black: {
      user: { name: 'Opponent123', id: 'opponent123' },
      rating: 1500,
      ratingDiff: -8,
      analysis: {
        inaccuracy: 8,
        mistake: 5,
        blunder: 4,
        acpl: 58,
        accuracy: 72,
      },
    },
  },
  winner: 'white',
  opening: { eco: 'B20', name: 'Sicilian Defense', ply: 4 },
  moves: 'e4 c5 Nf3 d6 d4',
};

export const lichessGameWithoutAnalysis = {
  id: 'noanalysis123',
  rated: true,
  variant: 'standard',
  speed: 'blitz',
  perf: 'blitz',
  createdAt: 1718445600000,
  lastMoveAt: 1718445900000,
  status: 'mate',
  players: {
    white: {
      user: { name: 'TestUser', id: 'testuser' },
      rating: 1550,
    },
    black: {
      user: { name: 'Opponent123', id: 'opponent123' },
      rating: 1500,
    },
  },
  winner: 'white',
  opening: { eco: 'B20', name: 'Sicilian Defense', ply: 4 },
  moves: 'e4 c5 Nf3 d6 d4',
};

// ============================================
// LICHESS CLOUD EVAL RESPONSES
// ============================================

export const lichessCloudEvalResponse = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  knodes: 10000,
  depth: 22,
  pvs: [
    { moves: 'c7c5 g1f3 d7d6 d2d4', cp: 20 },
    { moves: 'e7e5 g1f3 b8c6', cp: 25 },
  ],
};

export const lichessCloudEvalNotFoundResponse = {
  error: 'Position not found',
};
