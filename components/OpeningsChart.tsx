'use client';

import { memo, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { Game, OpeningDataPoint, PlayerColor } from '@/lib/types';
import { calculateOpeningStats } from '@/lib/utils';
import GamesTable from './games/GamesTable';

interface OpeningsChartProps {
  games: Game[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: OpeningDataPoint & { label: string }; dataKey: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const winRate = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-foreground font-medium mb-1">{label}</p>
        <p className="text-xs text-muted-foreground mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <p className="text-success">Wins: {data.wins}</p>
          <p className="text-destructive">Losses: {data.losses}</p>
          <p className="text-warning">Draws: {data.draws}</p>
          <p className="text-foreground pt-1 border-t border-border">
            Win Rate: {winRate}%
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
          Click to view games
        </p>
      </div>
    );
  }
  return null;
}

function formatOpeningLabel(eco: string, name: string, maxLength: number = 25): string {
  const mainName = name.split(':')[0].split(',')[0].trim();
  const truncated = mainName.length > maxLength
    ? mainName.substring(0, maxLength - 1) + '…'
    : mainName;
  return `${eco} ${truncated}`;
}

type ColorFilter = 'all' | PlayerColor;

const OpeningsChart = memo(function OpeningsChart({ games }: OpeningsChartProps) {
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [selectedEco, setSelectedEco] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const openingData = calculateOpeningStats(
      games,
      colorFilter === 'all' ? {} : { playerColor: colorFilter }
    );
    return openingData.map((d) => ({
      ...d,
      label: formatOpeningLabel(d.eco, d.name),
    }));
  }, [games, colorFilter]);

  const selectedGames = useMemo(() => {
    if (!selectedEco) return [];
    return games
      .filter((g) => {
        const matchesEco = g.opening.eco === selectedEco;
        const matchesColor = colorFilter === 'all' || g.playerColor === colorFilter;
        return matchesEco && matchesColor;
      })
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  }, [games, selectedEco, colorFilter]);

  const selectedOpening = chartData.find((d) => d.eco === selectedEco);

  const handleBarClick = (data: OpeningDataPoint & { label: string }) => {
    setSelectedEco(selectedEco === data.eco ? null : data.eco);
  };

  if (games.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
        <button
          onClick={() => { setColorFilter('all'); setSelectedEco(null); }}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            colorFilter === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setColorFilter('white'); setSelectedEco(null); }}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            colorFilter === 'white'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-3 h-3 bg-white rounded-sm border border-border" />
          As White
        </button>
        <button
          onClick={() => { setColorFilter('black'); setSelectedEco(null); }}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            colorFilter === 'black'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-3 h-3 bg-zinc-800 rounded-sm border border-border" />
          As Black
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          No openings found for this color
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 8, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--chart-grid)]" horizontal={false} />
              <XAxis
                type="number"
                className="stroke-[var(--chart-axis)]"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                className="stroke-[var(--chart-axis)]"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={200}
                tick={({ x, y, payload }) => {
                  const isSelected = chartData.find(d => d.label === payload.value)?.eco === selectedEco;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="start"
                      dx={-195}
                      fontSize={12}
                      fill={isSelected ? 'var(--primary)' : 'var(--chart-axis)'}
                      fontWeight={isSelected ? 600 : 400}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'var(--secondary)', opacity: 0.3 }}
                wrapperStyle={{ pointerEvents: 'none' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                formatter={(value) => <span className="text-muted-foreground text-sm">{value}</span>}
              />
              <Bar dataKey="wins" stackId="a" name="Wins" radius={[0, 0, 0, 0]} style={{ cursor: 'pointer' }}>
                {chartData.map((entry) => (
                  <Cell
                    key={`wins-${entry.eco}`}
                    fill={entry.eco === selectedEco ? '#16a34a' : '#22c55e'}
                    onClick={() => handleBarClick(entry)}
                  />
                ))}
              </Bar>
              <Bar dataKey="draws" stackId="a" name="Draws" style={{ cursor: 'pointer' }}>
                {chartData.map((entry) => (
                  <Cell
                    key={`draws-${entry.eco}`}
                    fill={entry.eco === selectedEco ? '#ca8a04' : '#eab308'}
                    onClick={() => handleBarClick(entry)}
                  />
                ))}
              </Bar>
              <Bar dataKey="losses" stackId="a" name="Losses" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }}>
                {chartData.map((entry) => (
                  <Cell
                    key={`losses-${entry.eco}`}
                    fill={entry.eco === selectedEco ? '#dc2626' : '#ef4444'}
                    onClick={() => handleBarClick(entry)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedEco && selectedOpening && (
        <div className="border border-border rounded-lg overflow-hidden animate-fade-in-up">
          <div className="bg-secondary/50 px-4 py-3 flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">
                {selectedOpening.name}
                <span className="text-muted-foreground ml-2 text-sm">({selectedOpening.eco})</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                {selectedGames.length} game{selectedGames.length !== 1 ? 's' : ''}
                {colorFilter !== 'all' && ` as ${colorFilter}`}
                {' · '}
                <span className="text-green-400">{selectedOpening.wins}W</span>
                {' / '}
                <span className="text-red-400">{selectedOpening.losses}L</span>
                {' / '}
                <span className="text-muted-foreground">{selectedOpening.draws}D</span>
                {' · '}
                {((selectedOpening.wins / selectedOpening.total) * 100).toFixed(0)}% win rate
              </p>
            </div>
            <button
              onClick={() => setSelectedEco(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              aria-label="Close games list"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            <GamesTable games={selectedGames} maxRows={10} showOpening={false} />
          </div>
        </div>
      )}
    </div>
  );
});

export default OpeningsChart;
