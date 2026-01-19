'use client';

import type { ExplorerNode } from '@/lib/explorer/types';

interface MoveTreeProps {
  /** Current position node */
  node: ExplorerNode | null;
  /** Callback when a move is clicked */
  onMoveClick: (san: string) => void;
}

/** Bar segment with percentage label when there's enough space */
function BarSegment({
  percentage,
  color,
  textColor,
  label,
}: {
  percentage: number;
  color: string;
  textColor: string;
  label: string;
}) {
  if (percentage === 0) return null;

  // Only show label if segment is wide enough (roughly > 20%)
  const showLabel = percentage >= 20;

  return (
    <div
      className={`${color} h-full flex items-center justify-center overflow-hidden transition-[width] duration-200`}
      style={{ width: `${percentage}%` }}
      title={label}
    >
      {showLabel && (
        <span className={`text-xs font-medium ${textColor} tabular-nums`}>
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

export default function MoveTree({ node, onMoveClick }: MoveTreeProps) {
  if (!node) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-muted-foreground text-center">No data for this position</p>
      </div>
    );
  }

  if (node.children.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-muted-foreground text-center">No games continue from this position</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="w-12">Move</span>
          <span className="flex-1">Results</span>
          <span className="w-14 text-right">Games</span>
        </div>
      </div>

      {/* Move rows */}
      <div className="divide-y divide-border">
        {node.children.map((move) => {
          const { stats } = move;
          const winPct = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
          const drawPct = stats.total > 0 ? (stats.draws / stats.total) * 100 : 0;
          const lossPct = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0;

          return (
            <button
              key={move.san}
              onClick={() => onMoveClick(move.san)}
              className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {/* Move notation */}
              <span className="font-mono font-semibold text-foreground w-12">
                {move.san}
              </span>

              {/* Stats bar - muted colors with labels */}
              <div className="flex-1 h-6 rounded overflow-hidden flex bg-secondary">
                <BarSegment
                  percentage={winPct}
                  color="bg-emerald-700"
                  textColor="text-emerald-100"
                  label={`Wins: ${stats.wins} (${winPct.toFixed(1)}%)`}
                />
                <BarSegment
                  percentage={drawPct}
                  color="bg-muted-foreground"
                  textColor="text-foreground"
                  label={`Draws: ${stats.draws} (${drawPct.toFixed(1)}%)`}
                />
                <BarSegment
                  percentage={lossPct}
                  color="bg-rose-800"
                  textColor="text-rose-100"
                  label={`Losses: ${stats.losses} (${lossPct.toFixed(1)}%)`}
                />
              </div>

              {/* Games count */}
              <span className="w-14 text-right text-muted-foreground tabular-nums text-sm">
                {stats.total.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
