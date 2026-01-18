import type { ExplorerNode, BuildTreeOptions, GameWithPgn } from './types';

/**
 * Message sent to the worker to build the explorer tree
 */
export interface BuildTreeMessage {
  type: 'BUILD_TREE';
  payload: {
    games: GameWithPgn[];
    options: BuildTreeOptions;
  };
}

/**
 * All possible messages sent to the worker
 */
export type WorkerMessage = BuildTreeMessage;

/**
 * Serialized node for transfer (same as ExplorerNode but for clarity)
 */
export type SerializedNode = ExplorerNode;

/**
 * Serialized tree structure for transfer from worker
 * (Map converted to array of entries for JSON serialization)
 */
export interface SerializedTree {
  nodes: [string, SerializedNode][];
  rootKey: string;
  totalGames: number;
  gamesWithoutPgn: number;
}

/**
 * Success response from worker with built tree
 */
export interface TreeReadyResponse {
  type: 'TREE_READY';
  payload: SerializedTree;
}

/**
 * Error response from worker
 */
export interface ErrorResponse {
  type: 'ERROR';
  payload: {
    error: string;
  };
}

/**
 * Progress update from worker (optional, for future use)
 */
export interface ProgressResponse {
  type: 'PROGRESS';
  payload: {
    processed: number;
    total: number;
  };
}

/**
 * All possible responses from the worker
 */
export type WorkerResponse = TreeReadyResponse | ErrorResponse | ProgressResponse;
