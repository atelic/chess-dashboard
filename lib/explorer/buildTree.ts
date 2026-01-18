import { Chess } from 'chess.js';
import type {
  ExplorerTree,
  ExplorerNode,
  ExplorerStats,
  ColorStats,
  BuildTreeOptions,
  GameWithPgn,
  ParsedGame,
} from './types';
import type { PlayerColor } from '@/lib/types';
import type { GameResult } from '@/lib/types';

const DEFAULT_MAX_DEPTH = 60; // 30 full moves
const DEFAULT_MIN_GAMES = 1;
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Generate a position key from a FEN string.
 * Uses only board position and side-to-move for deduplication
 * (ignores castling rights, en passant, and move counters).
 */
export function getPositionKey(fen: string): string {
  const parts = fen.split(' ');
  // Use only piece placement (parts[0]) and side to move (parts[1])
  return `${parts[0]} ${parts[1]}`;
}

/**
 * Create empty stats object
 */
function createEmptyStats(): ExplorerStats {
  return {
    total: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
  };
}

/**
 * Create empty color stats object
 */
function createEmptyColorStats(): ColorStats {
  return {
    white: createEmptyStats(),
    black: createEmptyStats(),
  };
}

/**
 * Update stats with a game result
 */
function addGameToStats(stats: ExplorerStats, result: GameResult): void {
  stats.total++;

  switch (result) {
    case 'win':
      stats.wins++;
      break;
    case 'loss':
      stats.losses++;
      break;
    case 'draw':
      stats.draws++;
      break;
  }

  stats.winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
}

/**
 * Update both aggregate and color-specific stats
 */
function addGameToAllStats(
  stats: ExplorerStats,
  colorStats: ColorStats,
  result: GameResult,
  playerColor: PlayerColor
): void {
  addGameToStats(stats, result);
  addGameToStats(colorStats[playerColor], result);
}

/**
 * Parse a PGN and extract all positions reached
 */
export function parseGamePositions(
  gameId: string,
  pgn: string,
  result: GameResult,
  playerColor: 'white' | 'black',
  maxDepth: number
): ParsedGame | null {
  try {
    const chess = new Chess();

    // Load the PGN
    chess.loadPgn(pgn);

    // Get the move history
    const history = chess.history({ verbose: true });

    // Reset to start position
    chess.reset();

    const positions: ParsedGame['positions'] = [];

    // Add starting position
    const startFen = chess.fen();
    positions.push({
      fen: startFen,
      positionKey: getPositionKey(startFen),
      move: null,
      moveUci: null,
      depth: 0,
    });

    // Replay moves and record positions
    for (let i = 0; i < history.length && i < maxDepth; i++) {
      const moveObj = history[i];
      chess.move(moveObj);

      const fen = chess.fen();
      positions.push({
        fen,
        positionKey: getPositionKey(fen),
        move: moveObj.san,
        moveUci: moveObj.from + moveObj.to + (moveObj.promotion || ''),
        depth: i + 1,
      });
    }

    return {
      gameId,
      result,
      playerColor,
      positions,
    };
  } catch {
    // PGN parsing failed
    return null;
  }
}

/**
 * Build an explorer tree from a list of games.
 * Always builds a "both" tree with per-color stats for efficient filtering.
 */
export function buildExplorerTree(
  games: GameWithPgn[],
  options: BuildTreeOptions = {}
): ExplorerTree {
  const {
    maxDepth = DEFAULT_MAX_DEPTH,
    minGames = DEFAULT_MIN_GAMES,
  } = options;
  // Note: perspective option is ignored - we always build "both" and filter later

  const nodes = new Map<string, ExplorerNode>();
  const rootKey = getPositionKey(STARTING_FEN);

  // Create root node
  nodes.set(rootKey, {
    positionKey: rootKey,
    fen: STARTING_FEN,
    parent: null,
    move: null,
    moveUci: null,
    children: [],
    stats: createEmptyStats(),
    colorStats: createEmptyColorStats(),
    depth: 0,
  });

  let gamesWithoutPgn = 0;
  let totalGames = 0;

  // Process each game (no perspective filtering - include all)
  for (const game of games) {
    if (!game.pgn) {
      gamesWithoutPgn++;
      continue;
    }

    const parsed = parseGamePositions(
      game.id,
      game.pgn,
      game.result,
      game.playerColor,
      maxDepth
    );

    if (!parsed) {
      gamesWithoutPgn++;
      continue;
    }

    totalGames++;

    // Add each position to the tree
    for (let i = 0; i < parsed.positions.length; i++) {
      const pos = parsed.positions[i];
      const parentKey = i > 0 ? parsed.positions[i - 1].positionKey : null;

      // Get or create node for this position
      let node = nodes.get(pos.positionKey);
      if (!node) {
        node = {
          positionKey: pos.positionKey,
          fen: pos.fen,
          parent: parentKey,
          move: pos.move,
          moveUci: pos.moveUci,
          children: [],
          stats: createEmptyStats(),
          colorStats: createEmptyColorStats(),
          depth: pos.depth,
        };
        nodes.set(pos.positionKey, node);
      }

      // Update stats for this position (both aggregate and per-color)
      addGameToAllStats(node.stats, node.colorStats, game.result, game.playerColor);

      // Add move to parent's children (if not already there)
      if (parentKey && pos.move) {
        const parent = nodes.get(parentKey);
        if (parent) {
          let moveChild = parent.children.find((c) => c.san === pos.move);
          if (!moveChild) {
            moveChild = {
              san: pos.move,
              uci: pos.moveUci || '',
              targetPosition: pos.positionKey,
              stats: createEmptyStats(),
              colorStats: createEmptyColorStats(),
            };
            parent.children.push(moveChild);
          }
          // Update move stats (both aggregate and per-color)
          addGameToAllStats(moveChild.stats, moveChild.colorStats, game.result, game.playerColor);
        }
      }
    }
  }

  // Sort children by total games (most popular first)
  for (const node of nodes.values()) {
    node.children.sort((a, b) => b.stats.total - a.stats.total);
  }

  // Filter out nodes with too few games if minGames > 1
  if (minGames > 1) {
    const keysToRemove: string[] = [];
    for (const [key, node] of nodes.entries()) {
      if (node.stats.total < minGames && key !== rootKey) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      nodes.delete(key);
    }

    // Update children references
    for (const node of nodes.values()) {
      node.children = node.children.filter(
        (c) => nodes.has(c.targetPosition) && c.stats.total >= minGames
      );
    }
  }

  return {
    nodes,
    rootKey,
    totalGames,
    gamesWithoutPgn,
  };
}

/**
 * Get the node at a specific position
 */
export function getNode(tree: ExplorerTree, positionKey: string): ExplorerNode | null {
  return tree.nodes.get(positionKey) || null;
}

/**
 * Get the root node of the tree
 */
export function getRootNode(tree: ExplorerTree): ExplorerNode | null {
  return tree.nodes.get(tree.rootKey) || null;
}

/**
 * Navigate to a position by playing a move
 */
export function getNodeAfterMove(
  tree: ExplorerTree,
  currentKey: string,
  san: string
): ExplorerNode | null {
  const current = tree.nodes.get(currentKey);
  if (!current) return null;

  const move = current.children.find((c) => c.san === san);
  if (!move) return null;

  return tree.nodes.get(move.targetPosition) || null;
}

/**
 * Get the path of moves from root to a position
 */
export function getMovePath(tree: ExplorerTree, positionKey: string): string[] {
  const path: string[] = [];
  let current: ExplorerNode | undefined = tree.nodes.get(positionKey);

  while (current && current.move) {
    path.unshift(current.move);
    current = current.parent ? tree.nodes.get(current.parent) : undefined;
  }

  return path;
}

/**
 * Calculate position from move history
 */
export function getPositionFromMoves(moves: string[]): { fen: string; positionKey: string } | null {
  try {
    const chess = new Chess();
    for (const move of moves) {
      chess.move(move);
    }
    const fen = chess.fen();
    return {
      fen,
      positionKey: getPositionKey(fen),
    };
  } catch {
    return null;
  }
}
