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
import type { Game } from '@/lib/types';
import {
  calculateHourlyStats,
  calculateDayOfWeekStats,
  calculateTimeHeatmap,
  findPeakPerformanceTimes,
  findWorstPerformanceTimes,
} from '@/lib/utils';
import Card from './ui/Card';

interface TimeOfDayChartProps {
  games: Game[];
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Color scale for win rate (red -> yellow -> green)
function getWinRateColor(winRate: number, games: number): string {
  if (games === 0) return '#27272a'; // zinc-800 for no games
  if (winRate < 40) return '#ef4444'; // red
  if (winRate < 50) return '#f97316'; // orange
  if (winRate < 55) return '#eab308'; // yellow
  if (winRate < 60) return '#84cc16'; // lime
  return '#22c55e'; // green
}

// Format hour in 12-hour format (e.g., "2pm", "12am")
function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

const TimeOfDayChart = memo(function TimeOfDayChart({ games }: TimeOfDayChartProps) {
  const hourlyStats = useMemo(() => calculateHourlyStats(games), [games]);
  const dayOfWeekStats = useMemo(() => calculateDayOfWeekStats(games), [games]);
  const heatmapData = useMemo(() => calculateTimeHeatmap(games), [games]);
  const peakTimes = useMemo(() => findPeakPerformanceTimes(games, 5), [games]);
  const worstTimes = useMemo(() => findWorstPerformanceTimes(games, 5), [games]);

  const overallWinRate = useMemo(() => {
    const wins = games.filter((g) => g.result === 'win').length;
    return games.length > 0 ? (wins / games.length) * 100 : 0;
  }, [games]);

  if (games.length === 0) {
    return (
      <Card title="Playing Schedule" subtitle="When do you play your best chess?">
        <div className="h-64 flex items-center justify-center text-zinc-500">
          No games to analyze
        </div>
      </Card>
    );
  }

  // Prepare hourly chart data (group into 4-hour blocks for readability)
  const hourlyChartData = [];
  for (let i = 0; i < 24; i += 4) {
    let totalGames = 0, totalWins = 0;
    for (let h = i; h < i + 4 && h < 24; h++) {
      totalGames += hourlyStats[h].games;
      totalWins += hourlyStats[h].wins;
    }
    const startHour = i % 12 || 12;
    const endHour = (i + 4) % 12 || 12;
    const startPeriod = i < 12 ? 'am' : 'pm';
    const endPeriod = (i + 4) % 24 < 12 ? 'am' : 'pm';
    hourlyChartData.push({
      name: `${startHour}${startPeriod}-${endHour}${endPeriod}`,
      games: totalGames,
      winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
    });
  }

  return (
    <Card
      title="Playing Schedule"
      subtitle="When do you play your best chess?"
    >
      <div className="space-y-6">
        {/* Peak/Worst Time Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {peakTimes && peakTimes.winRate > overallWinRate + 5 && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400">&#9733;</span>
                <span className="text-green-400 font-medium">Peak Performance</span>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{peakTimes.label}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {Math.round(peakTimes.winRate)}% win rate ({peakTimes.games} games)
              </div>
            </div>
          )}
          {worstTimes && worstTimes.winRate < overallWinRate - 5 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-400">&#9888;</span>
                <span className="text-red-400 font-medium">Avoid Playing</span>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{worstTimes.label}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {Math.round(worstTimes.winRate)}% win rate ({worstTimes.games} games)
              </div>
            </div>
          )}
        </div>

        {/* Heatmap */}
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-3">Win Rate by Time & Day</h4>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="w-12"></div>
                {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
                  <div key={hour} className="flex-1 text-xs text-zinc-500 text-center">
                    {formatHour(hour)}
                  </div>
                ))}
              </div>
              {/* Heatmap rows */}
              {DAY_NAMES_SHORT.map((dayName, dayIndex) => (
                <div key={dayName} className="flex items-center mb-1">
                  <div className="w-12 text-xs text-zinc-500">{dayName}</div>
                  <div className="flex-1 flex gap-0.5">
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const cell = heatmapData.find((c) => c.day === dayIndex && c.hour === hour);
                      const cellGames = cell?.games || 0;
                      const cellWinRate = cell?.winRate || 0;
                      return (
                        <div
                          key={hour}
                          className="flex-1 aspect-square rounded-sm cursor-default"
                          style={{ backgroundColor: getWinRateColor(cellWinRate, cellGames) }}
                          title={cellGames > 0
                            ? `${dayName} ${formatHour(hour)} - ${cellGames} games, ${Math.round(cellWinRate)}% win rate`
                            : `${dayName} ${formatHour(hour)} - No games`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-zinc-800"></div>
                  <span>No games</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                  <span>&lt;40%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
                  <span>50%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                  <span>&gt;60%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Games by Time of Day */}
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-3">Games by Time of Day</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fafafa' }}
                formatter={(value, name) => {
                  if (name === 'games') return [value, 'Games'];
                  return [`${value}%`, 'Win Rate'];
                }}
              />
              <Bar dataKey="games" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {hourlyChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getWinRateColor(entry.winRate, entry.games)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day of Week Performance */}
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-3">Performance by Day of Week</h4>
          <div className="grid grid-cols-7 gap-2">
            {dayOfWeekStats.map((day) => (
              <div
                key={day.day}
                className="bg-zinc-800 rounded-lg p-3 text-center"
              >
                <div className="text-xs text-zinc-500">{DAY_NAMES_SHORT[day.day]}</div>
                <div className={`text-lg font-semibold mt-1 ${
                  day.games === 0 ? 'text-zinc-600' :
                  day.winRate < 45 ? 'text-red-400' :
                  day.winRate > 55 ? 'text-green-400' : 'text-zinc-100'
                }`}>
                  {day.games > 0 ? `${Math.round(day.winRate)}%` : '-'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {day.games} games
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});

export default TimeOfDayChart;
