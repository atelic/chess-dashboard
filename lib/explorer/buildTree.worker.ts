/**
 * Web Worker for building the explorer tree off the main thread.
 * This file runs in a Worker context - no DOM access.
 */

import { buildExplorerTree } from './buildTree';
import type { WorkerMessage, WorkerResponse, SerializedTree } from './workerTypes';
import type { ExplorerTree } from './types';

/**
 * Serialize the tree for transfer to main thread
 * (Map needs to be converted to array for postMessage)
 */
function serializeTree(tree: ExplorerTree): SerializedTree {
  return {
    nodes: Array.from(tree.nodes.entries()),
    rootKey: tree.rootKey,
    totalGames: tree.totalGames,
    gamesWithoutPgn: tree.gamesWithoutPgn,
  };
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'BUILD_TREE') {
    try {
      // Build the tree (this is the expensive operation)
      const tree = buildExplorerTree(payload.games, payload.options);

      // Serialize and send back to main thread
      const response: WorkerResponse = {
        type: 'TREE_READY',
        payload: serializeTree(tree),
      };

      self.postMessage(response);
    } catch (error) {
      // Send error back to main thread
      const response: WorkerResponse = {
        type: 'ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error building tree',
        },
      };

      self.postMessage(response);
    }
  }
};

// Signal that worker is ready
self.postMessage({ type: 'READY' });
