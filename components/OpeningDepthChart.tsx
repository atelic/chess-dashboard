'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Game, PlayerColor } from '@/lib/types';
import { calculateOpeningsByColor } from '@/lib/utils';
import Card from './ui/Card';

interface OpeningDepthChartProps {
  games: Game[];
}

interface OpeningDepthData {
  eco: string;
  name: string;
  avgMoveCount: number;
  games: number;
  winRate: number;
  color: PlayerColor;
}

/**
 * Calculates the average move count per opening as a proxy for "opening depth"
 * Games that end early in an opening suggest the player is comfortable with theory,
 * while longer games might indicate theoretical struggles or complex middlegames.
 */
function calculateOpeningDepthData(games: Game[]): {
  white: OpeningDepthData[];
  black: OpeningDepthData[];
  overallAvgDepth: number;
} {
  const whiteOpenings = calculateOpeningsByColor(games, 'white');
  const blackOpenings = calculateOpeningsByColor(games, 'black');

  // Group games by opening to calculate average move count
  const openingMoves = new Map<string, { total: number; count: number; color: PlayerColor }>();

  for (const game of games) {
    if (game.opening.eco === 'Unknown') continue;
    
    const key = `${game.opening.eco}-${game.playerColor}`;
    const current = openingMoves.get(key) || { total: 0, count: 0, color: game.playerColor };
    current.total += game.moveCount;
    current.count++;
    openingMoves.set(key, current);
  }

  const getDepthData = (openings: typeof whiteOpenings): OpeningDepthData[] => {
    return openings
      .filter(o => o.games >= 3)
      .map(o => {
        const key = `${o.eco}-${o.color}`;
        const moveData = openingMoves.get(key);
        return {
          eco: o.eco,
          name: o.name.length > 25 ? o.name.substring(0, 22) + '...' : o.name,
          avgMoveCount: moveData ? Math.round(moveData.total / moveData.count) : 0,
          games: o.games,
          winRate: o.winRate,
          color: o.color,
        };
      })
      .sort((a, b) => b.games - a.games)
      .slice(0, 8);
  };

  const whiteData = getDepthData(whiteOpenings);
  const blackData = getDepthData(blackOpenings);

  // Calculate overall average move count as a reference
  const gamesWithMoves = games.filter(g => g.moveCount > 0);
  const overallAvgDepth = gamesWithMoves.length > 0
    ? Math.round(gamesWithMoves.reduce((sum, g) => sum + g.moveCount, 0) / gamesWithMoves.length)
    : 0;

  return { white: whiteData, black: blackData, overallAvgDepth };
}

function DepthBarChart({ data, title }: { data: OpeningDepthData[]; title: string }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Not enough games to show {title.toLowerCase()} opening depth
      </div>
    );
  }

  const getBarColor = (winRate: number) => {
    if (winRate >= 60) return '#22c55e'; // green
    if (winRate >= 45) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
        <span className={`w-3 h-3 ${title === 'White' ? 'bg-white' : 'bg-zinc-800'} rounded-sm border border-zinc-500`} />
        {title} Openings
      </h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke="#71717a"
            fontSize={12}
            tickFormatter={(v) => `${v}`}
            domain={[0, 'auto']}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#71717a"
            fontSize={11}
            width={100}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fafafa' }}
            formatter={(value, _name, props) => {
              const item = props.payload as OpeningDepthData;
              return [
                `${value} moves avg (${item.games} games, ${item.winRate.toFixed(0)}% win rate)`,
                'Depth',
              ];
            }}
          />
          <Bar dataKey="avgMoveCount" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.winRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OpeningDepthChart({ games }: OpeningDepthChartProps) {
  const depthData = useMemo(() => calculateOpeningDepthData(games), [games]);

  if (games.length === 0) {
    return (
      <Card title="Opening Depth" subtitle="How deep you play into opening theory">
        <div className="h-64 flex items-center justify-center text-zinc-500">
          No games to analyze
        </div>
      </Card>
    );
  }

  const hasData = depthData.white.length > 0 || depthData.black.length > 0;

  return (
    <Card
      title="Opening Depth"
      subtitle={`Average game length by opening (overall avg: ${depthData.overallAvgDepth} moves)`}
    >
      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <p>Not enough opening data</p>
            <p className="text-sm mt-1">Play more games to see opening depth analysis</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">White Openings</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {depthData.white.length}
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">Black Openings</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {depthData.black.length}
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">Avg Game Length</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {depthData.overallAvgDepth} moves
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">Games Analyzed</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {games.filter(g => g.opening.eco !== 'Unknown').length}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500" />
              &ge;60% win rate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-500" />
              45-60% win rate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500" />
              &lt;45% win rate
            </span>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DepthBarChart data={depthData.white} title="White" />
            <DepthBarChart data={depthData.black} title="Black" />
          </div>

          {/* Tip */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">💡</span>
              <div>
                <h4 className="text-zinc-300 font-medium">Reading This Chart</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  Longer bars indicate openings where your games tend to last longer. 
                  This could mean you&apos;re playing complex positions that require more moves to resolve, 
                  or that you&apos;re comfortable navigating the middlegame that arises from that opening.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
