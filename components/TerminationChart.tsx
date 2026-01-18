'use client';

import { memo, useMemo } from 'react';
import type { Game } from '@/lib/types';
import { calculateTerminationStats } from '@/lib/utils';
import Card from './ui/Card';

interface TerminationChartProps {
  games: Game[];
}

const TerminationChart = memo(function TerminationChart({ games }: TerminationChartProps) {
  const stats = useMemo(() => calculateTerminationStats(games), [games]);

  if (stats.length === 0) {
    return (
      <Card title="How Games End">
        <div className="text-center py-8 text-zinc-500">
          No termination data available
        </div>
      </Card>
    );
  }

  // Filter out terminations with no wins or losses
  const relevantStats = stats.filter(s => s.asWinner > 0 || s.asLoser > 0);
  
  // Find max for scaling
  const maxCount = Math.max(...relevantStats.map(s => Math.max(s.asWinner, s.asLoser)));

  return (
    <Card 
      title="How Games End" 
      subtitle="Win and loss breakdown by game termination type"
    >
      <div className="space-y-4">
        {relevantStats.map((stat) => (
          <div key={stat.termination} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-300">{stat.label}</span>
              <span className="text-xs text-zinc-500">
                {stat.asWinner + stat.asLoser} games
              </span>
            </div>
            
            {/* Wins bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-12">Won</span>
              <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 flex items-center justify-end pr-2 transition-[width] duration-200"
                  style={{ width: `${maxCount > 0 ? (stat.asWinner / maxCount) * 100 : 0}%` }}
                >
                  {stat.asWinner > 0 && (
                    <span className="text-xs font-medium text-green-100">
                      {stat.asWinner}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Losses bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-12">Lost</span>
              <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                <div
                  className="h-full bg-red-500 flex items-center justify-end pr-2 transition-[width] duration-200"
                  style={{ width: `${maxCount > 0 ? (stat.asLoser / maxCount) * 100 : 0}%` }}
                >
                  {stat.asLoser > 0 && (
                    <span className="text-xs font-medium text-red-100">
                      {stat.asLoser}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-green-400">
              {relevantStats.reduce((sum, s) => sum + s.asWinner, 0)}
            </div>
            <div className="text-xs text-zinc-500">Total Wins</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-red-400">
              {relevantStats.reduce((sum, s) => sum + s.asLoser, 0)}
            </div>
            <div className="text-xs text-zinc-500">Total Losses</div>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default TerminationChart;
