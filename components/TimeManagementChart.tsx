'use client';

import { useMemo, memo } from 'react';
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
import type { Game, TimeClass } from '@/lib/types';
import { calculateTimeStats, analyzeTimePressure } from '@/lib/utils';
import Card from './ui/Card';

interface TimeManagementChartProps {
  games: Game[];
}

const TIME_CLASS_LABELS: Record<TimeClass, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
};

const TIME_CLASS_COLORS: Record<TimeClass, string> = {
  bullet: '#f97316', // orange
  blitz: '#eab308', // yellow
  rapid: '#22c55e', // green
  classical: '#3b82f6', // blue
};

const TimeManagementChart = memo(function TimeManagementChart({ games }: TimeManagementChartProps) {
  const timeStats = useMemo(() => calculateTimeStats(games), [games]);
  const pressureStats = useMemo(() => analyzeTimePressure(games), [games]);

  // Check if we have any clock data
  if (timeStats.gamesWithClockData === 0) {
    return (
      <Card title="Time Management" subtitle="Analyze your clock usage patterns">
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>No clock data available</p>
            <p className="text-sm mt-1">Sync your games to see time management stats</p>
          </div>
        </div>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = timeStats.byTimeClass.map((tc) => ({
    name: TIME_CLASS_LABELS[tc.timeClass],
    timeClass: tc.timeClass,
    timeoutRate: Math.round(tc.timeoutRate),
    avgTimeRemaining: Math.round(tc.avgTimeRemaining),
    games: tc.games,
  }));

  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    return `${Math.round(seconds)}s`;
  };

  return (
    <Card
      title="Time Management"
      subtitle={`Based on ${timeStats.gamesWithClockData} games with clock data`}
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-muted-foreground text-sm">Avg Time Remaining</div>
            <div className="text-xl font-semibold text-foreground mt-1">
              {formatTime(timeStats.avgTimeRemaining)}
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-muted-foreground text-sm">Avg Move Time</div>
            <div className="text-xl font-semibold text-foreground mt-1">
              {formatTime(timeStats.avgMoveTime)}
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-muted-foreground text-sm">Timeout Loss Rate</div>
            <div className={`text-xl font-semibold mt-1 ${
              timeStats.timeoutLossRate > 20 ? 'text-red-400' : 'text-foreground'
            }`}>
              {Math.round(timeStats.timeoutLossRate)}%
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-muted-foreground text-sm">Time Trouble Games</div>
            <div className="text-xl font-semibold text-foreground mt-1">
              {pressureStats.gamesInTimeTrouble}
            </div>
          </div>
        </div>

        {/* Time Pressure Analysis */}
        {pressureStats.gamesInTimeTrouble > 0 && (
          <div className="bg-secondary/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Time Pressure Performance</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Win rate when low on time:</span>
                <span className={`ml-2 font-medium ${
                  pressureStats.winRateInTimeTrouble < 30 ? 'text-red-400' : 
                  pressureStats.winRateInTimeTrouble > 50 ? 'text-green-400' : 'text-foreground'
                }`}>
                  {Math.round(pressureStats.winRateInTimeTrouble)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total timeout losses:</span>
                <span className="ml-2 font-medium text-foreground">
                  {pressureStats.lossesToTimeout}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg time when winning:</span>
                <span className="ml-2 font-medium text-green-400">
                  {formatTime(pressureStats.avgTimeWhenWinning)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg time when losing:</span>
                <span className="ml-2 font-medium text-red-400">
                  {formatTime(pressureStats.avgTimeWhenLosing)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeout Rate by Time Control */}
        {chartData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Timeout Rate by Time Control</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tickFormatter={(v) => `${v}%`}
                  stroke="#71717a"
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  stroke="#71717a"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fafafa' }}
                  formatter={(value, _name, props) => {
                    const games = (props.payload as { games: number }).games;
                    return [`${value}% (${games} games)`, 'Timeout Rate'];
                  }}
                />
                <Bar dataKey="timeoutRate" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell 
                      key={entry.timeClass} 
                      fill={entry.timeoutRate > 30 ? '#ef4444' : TIME_CLASS_COLORS[entry.timeClass]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recommendations */}
        {timeStats.timeoutLossRate > 20 && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">&#x26A0;</span>
              <div>
                <h4 className="text-yellow-400 font-medium">Time Management Tip</h4>
                <p className="text-yellow-200/80 text-sm mt-1">
                  {timeStats.timeoutLossRate > 40 
                    ? "You're losing a significant number of games on time. Consider playing with an increment, or practice faster decision-making."
                    : "Your timeout rate is higher than ideal. Try to maintain a consistent pace throughout the game."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

export default TimeManagementChart;
