'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Game } from '@/lib/types';
import type { ExplorerTree } from './types';
import type { WorkerResponse, SerializedTree } from './workerTypes';
import { filterTreeByPerspective } from './filterTree';

// IndexedDB configuration
const CACHE_DB_NAME = 'explorer-cache-v2';
const CACHE_STORE_NAME = 'trees';
const CACHE_VERSION = 1;

// Empty tree for initial state
const EMPTY_TREE: ExplorerTree = {
  nodes: new Map(),
  rootKey: '',
  totalGames: 0,
  gamesWithoutPgn: 0,
};

// In-memory cache for the "both" tree and derived views
interface TreeCache {
  bothTree: ExplorerTree | null;
  gamesHash: string;
  filteredViews: Map<string, ExplorerTree>;
}

const treeCache: TreeCache = {
  bothTree: null,
  gamesHash: '',
  filteredViews: new Map(),
};

/**
 * Generate a hash from games for cache invalidation
 */
function generateGamesHash(games: Game[]): string {
  const gamesWithPgn = games.filter((g) => g.pgn);
  if (gamesWithPgn.length === 0) return '';

  const ids = gamesWithPgn.map((g) => g.id).sort().join(',');
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    hash = ((hash << 5) - hash) + ids.charCodeAt(i);
    hash = hash & hash;
  }
  return `${gamesWithPgn.length}-${hash}`;
}

/**
 * Deserialize tree from storage format
 */
function deserializeTree(data: SerializedTree): ExplorerTree {
  return {
    nodes: new Map(data.nodes),
    rootKey: data.rootKey,
    totalGames: data.totalGames,
    gamesWithoutPgn: data.gamesWithoutPgn,
  };
}

/**
 * Open IndexedDB connection
 */
function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Load "both" tree from IndexedDB cache
 */
async function loadFromIndexedDB(gamesHash: string): Promise<ExplorerTree | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(CACHE_STORE_NAME);
      const request = store.get(`both-${gamesHash}`);
      request.onsuccess = () => {
        const result = request.result;
        if (result?.data) {
          resolve(deserializeTree(result.data));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save "both" tree to IndexedDB cache
 */
async function saveToIndexedDB(gamesHash: string, tree: ExplorerTree): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openCacheDB();
    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(CACHE_STORE_NAME);

    // Serialize tree (convert Map to array)
    const serialized: SerializedTree = {
      nodes: Array.from(tree.nodes.entries()),
      rootKey: tree.rootKey,
      totalGames: tree.totalGames,
      gamesWithoutPgn: tree.gamesWithoutPgn,
    };

    // Save with timestamp for LRU cleanup
    store.put({
      key: `both-${gamesHash}`,
      data: serialized,
      savedAt: Date.now(),
    });

    // Clean up old entries (keep last 3)
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const all = allRequest.result;
      if (all.length > 3) {
        all.sort((a: { savedAt: number }, b: { savedAt: number }) => b.savedAt - a.savedAt);
        for (let i = 3; i < all.length; i++) {
          store.delete(all[i].key);
        }
      }
    };
  } catch {
    // IndexedDB not available - ignore
  }
}

/**
 * Get or create a filtered view for a perspective
 */
function getFilteredView(perspective: 'white' | 'black'): ExplorerTree {
  if (!treeCache.bothTree) return EMPTY_TREE;

  if (!treeCache.filteredViews.has(perspective)) {
    const filtered = filterTreeByPerspective(treeCache.bothTree, perspective);
    treeCache.filteredViews.set(perspective, filtered);
  }

  return treeCache.filteredViews.get(perspective)!;
}

/**
 * Hook for managing the explorer tree with Web Worker and caching.
 *
 * Features:
 * - Builds tree in Web Worker (non-blocking)
 * - Caches "both" tree in memory and IndexedDB
 * - Instant perspective switching via filtering (not rebuilding)
 */
export function useExplorerTree(
  games: Game[],
  perspective: 'white' | 'black' | 'both'
): {
  tree: ExplorerTree;
  isBuilding: boolean;
  error: string | null;
} {
  const [tree, setTree] = useState<ExplorerTree>(EMPTY_TREE);
  const [isBuilding, setIsBuilding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Generate hash for cache invalidation
  const gamesHash = useMemo(() => generateGamesHash(games), [games]);

  // Effect to build/load tree when games change
  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    // No games with PGN - nothing to build
    if (!gamesHash) {
      // Use microtask to avoid synchronous setState warning
      Promise.resolve().then(() => {
        setTree(EMPTY_TREE);
        setIsBuilding(false);
      });
      return;
    }

    let cancelled = false;

    async function loadOrBuild() {
      // Check in-memory cache first (instant)
      if (treeCache.gamesHash === gamesHash && treeCache.bothTree) {
        const view = perspective === 'both'
          ? treeCache.bothTree
          : getFilteredView(perspective);
        setTree(view);
        setIsBuilding(false);
        return;
      }

      // Check IndexedDB cache
      setIsBuilding(true);
      const cached = await loadFromIndexedDB(gamesHash);

      if (cancelled) return;

      if (cached) {
        // Cache hit - update in-memory cache
        treeCache.bothTree = cached;
        treeCache.gamesHash = gamesHash;
        treeCache.filteredViews.clear();

        const view = perspective === 'both'
          ? cached
          : getFilteredView(perspective);
        setTree(view);
        setIsBuilding(false);
        return;
      }

      // No cache - need to build with Web Worker
      try {
        // Terminate any existing worker
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        // Create new worker
        workerRef.current = new Worker(
          new URL('./buildTree.worker.ts', import.meta.url)
        );

        workerRef.current.onmessage = async (event: MessageEvent<WorkerResponse>) => {
          if (cancelled) return;

          const response = event.data;

          if (response.type === 'TREE_READY') {
            const bothTree = deserializeTree(response.payload as SerializedTree);

            // Update in-memory cache
            treeCache.bothTree = bothTree;
            treeCache.gamesHash = gamesHash;
            treeCache.filteredViews.clear();

            // Save to IndexedDB (async, don't wait)
            saveToIndexedDB(gamesHash, bothTree);

            // Set the appropriate view
            const view = perspective === 'both'
              ? bothTree
              : getFilteredView(perspective);
            setTree(view);
            setIsBuilding(false);
            setError(null);
          } else if (response.type === 'ERROR') {
            setError(response.payload.error);
            setIsBuilding(false);
          }
        };

        workerRef.current.onerror = (event) => {
          if (cancelled) return;
          setError(event.message || 'Worker error');
          setIsBuilding(false);
        };

        // Prepare games for worker
        const gamesToProcess = games
          .filter((g) => g.pgn)
          .map((g) => ({
            id: g.id,
            pgn: g.pgn!,
            result: g.result,
            playerColor: g.playerColor,
          }));

        // Send to worker
        workerRef.current.postMessage({
          type: 'BUILD_TREE',
          payload: {
            games: gamesToProcess,
            options: { maxDepth: 40 },
          },
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to create worker');
        setIsBuilding(false);
      }
    }

    loadOrBuild();

    return () => {
      cancelled = true;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamesHash]); // games and perspective intentionally excluded - we use gamesHash and build "both" tree

  // Effect to handle perspective changes (instant - just filter)
  useEffect(() => {
    if (!treeCache.bothTree || treeCache.gamesHash !== gamesHash) return;

    // Use microtask to avoid synchronous setState warning
    Promise.resolve().then(() => {
      const view = perspective === 'both'
        ? treeCache.bothTree!
        : getFilteredView(perspective);
      setTree(view);
    });
  }, [perspective, gamesHash]);

  return { tree, isBuilding, error };
}
