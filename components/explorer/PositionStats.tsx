'use client';

import type { ExplorerNode } from '@/lib/explorer/types';

interface PositionStatsProps {
  /** Current position node */
  node: ExplorerNode | null;
}

export default function PositionStats({ node }: PositionStatsProps) {
  if (!node) {
    return null;
  }

  const { stats } = node;
  const winPct = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
  const drawPct = stats.total > 0 ? (stats.draws / stats.total) * 100 : 0;
  const lossPct = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Total games */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm">Games:</span>
          <span className="font-semibold text-zinc-100">
            {stats.total.toLocaleString()}
          </span>
        </div>

        {/* Stats breakdown */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true" />
            <span className="text-zinc-300 text-sm">
              <span className="sr-only">Wins: </span>{stats.wins} ({winPct.toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-500" aria-hidden="true" />
            <span className="text-zinc-300 text-sm">
              <span className="sr-only">Draws: </span>{stats.draws} ({drawPct.toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
            <span className="text-zinc-300 text-sm">
              <span className="sr-only">Losses: </span>{stats.losses} ({lossPct.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Move count */}
        {node.depth > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">After:</span>
            <span className="font-mono text-zinc-100">
              {Math.ceil(node.depth / 2)}{node.depth % 2 === 1 ? '.' : '...'} moves
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
