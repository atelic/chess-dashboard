import type { ExplorerTree, ExplorerNode, ExplorerMove } from './types';
import type { PlayerColor } from '@/lib/types';

/**
 * Filter a "both" tree to show only games from one perspective.
 * This is O(n) where n = number of nodes, much faster than rebuilding (~10ms vs 500ms-2s).
 */
export function filterTreeByPerspective(
  tree: ExplorerTree,
  perspective: PlayerColor
): ExplorerTree {
  const filteredNodes = new Map<string, ExplorerNode>();

  for (const [key, node] of tree.nodes) {
    const colorStat = node.colorStats[perspective];

    // Skip nodes with no games from this perspective
    if (colorStat.total === 0) continue;

    // Filter children to only include moves with games from this perspective
    const filteredChildren: ExplorerMove[] = [];
    for (const child of node.children) {
      const childColorStat = child.colorStats[perspective];
      if (childColorStat.total > 0) {
        filteredChildren.push({
          ...child,
          stats: childColorStat, // Use perspective-specific stats for display
        });
      }
    }

    // Sort filtered children by total games (most popular first)
    filteredChildren.sort((a, b) => b.stats.total - a.stats.total);

    // Create filtered node with perspective-specific stats
    filteredNodes.set(key, {
      ...node,
      stats: colorStat, // Use perspective-specific stats for display
      children: filteredChildren,
    });
  }

  // Count total games for this perspective from root node
  const rootNode = filteredNodes.get(tree.rootKey);
  const totalGames = rootNode?.stats.total ?? 0;

  return {
    nodes: filteredNodes,
    rootKey: tree.rootKey,
    totalGames,
    gamesWithoutPgn: tree.gamesWithoutPgn,
  };
}

