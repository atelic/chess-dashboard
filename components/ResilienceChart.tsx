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
  PieChart,
  Pie,
} from 'recharts';
import type { Game } from '@/lib/types';
import { calculateResilienceStats } from '@/lib/utils';
import Card from './ui/Card';

interface ResilienceChartProps {
  games: Game[];
}

/**
 * Get a color for the mental score
 */
function getMentalScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 50) return '#eab308'; // yellow
  if (score >= 30) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get a label for the mental score
 */
function getMentalScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Average';
  if (score >= 20) return 'Needs Work';
  return 'Poor';
}

export default function ResilienceChart({ games }: ResilienceChartProps) {
  const stats = useMemo(() => calculateResilienceStats(games), [games]);

  const analyzedGames = games.filter((g) => g.analysis).length;

  if (analyzedGames < 5) {
    return (
      <Card
        title="Mental Game & Resilience"
        subtitle="Track your ability to handle pressure and convert advantages"
      >
        <div className="h-64 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <p>Not enough analyzed games</p>
            <p className="text-sm mt-1">
              Analyze at least 5 games to see resilience stats
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Prepare chart data
  const comparisonData = [
    {
      name: 'Comebacks',
      value: stats.comebackWins,
      color: '#22c55e',
    },
    {
      name: 'Blown Leads',
      value: stats.blownWins,
      color: '#ef4444',
    },
    {
      name: 'Converted',
      value: stats.convertedAdvantages,
      color: '#3b82f6',
    },
  ];

  const pieData = comparisonData.filter((d) => d.value > 0);

  const ratesData = [
    {
      name: 'Comeback Rate',
      rate: stats.comebackRate,
      fill: '#22c55e',
    },
    {
      name: 'Blow Rate',
      rate: stats.blowRate,
      fill: '#ef4444',
    },
  ];

  return (
    <Card
      title="Mental Game & Resilience"
      subtitle={`Based on ${analyzedGames} analyzed games`}
    >
      <div className="space-y-6">
        {/* Mental Score Gauge */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div
              className="w-32 h-32 rounded-full border-8 flex items-center justify-center"
              style={{ borderColor: getMentalScoreColor(stats.mentalScore) }}
            >
              <div className="text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ color: getMentalScoreColor(stats.mentalScore) }}
                >
                  {stats.mentalScore}
                </div>
                <div className="text-xs text-zinc-400">Mental Score</div>
              </div>
            </div>
          </div>
          <div className="ml-6">
            <div
              className="text-lg font-medium"
              style={{ color: getMentalScoreColor(stats.mentalScore) }}
            >
              {getMentalScoreLabel(stats.mentalScore)}
            </div>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">
              {stats.mentalScore >= 60
                ? 'You handle pressure well and convert advantages consistently.'
                : stats.mentalScore >= 40
                ? 'You have room to improve in handling winning/losing positions.'
                : 'Focus on staying calm and converting your advantages.'}
            </p>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-950/30 border border-green-900/50 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Comeback Wins</div>
            <div className="text-xl font-semibold text-green-400 mt-1">
              {stats.comebackWins}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {stats.comebackRate.toFixed(0)}% rate
            </div>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Blown Wins</div>
            <div className="text-xl font-semibold text-red-400 mt-1">
              {stats.blownWins}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {stats.blowRate.toFixed(0)}% rate
            </div>
          </div>
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Converted Advantages</div>
            <div className="text-xl font-semibold text-blue-400 mt-1">
              {stats.convertedAdvantages}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Volatile Games</div>
            <div className="text-xl font-semibold text-zinc-100 mt-1">
              {stats.volatileGames}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {analyzedGames > 0
                ? ((stats.volatileGames / analyzedGames) * 100).toFixed(0)
                : 0}
              % of games
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outcome Distribution */}
          {pieData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3">
                Game Outcomes
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value} games`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rates Comparison */}
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-3">
              Performance Rates
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratesData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#71717a"
                  fontSize={12}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#71717a"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(0)}%`, 'Rate']}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {ratesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tips based on stats */}
        <div className="space-y-3">
          {stats.blowRate > 30 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="text-red-400 font-medium">
                    High Blow Rate Detected
                  </h4>
                  <p className="text-red-200/80 text-sm mt-1">
                    You&apos;re losing too many games from winning positions. When ahead,
                    play more carefully - simplify, trade pieces, and avoid
                    complications.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.comebackRate >= 30 && stats.comebackWins >= 3 && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">💪</span>
                <div>
                  <h4 className="text-green-400 font-medium">
                    Strong Comeback Ability
                  </h4>
                  <p className="text-green-200/80 text-sm mt-1">
                    You&apos;re great at fighting back from losing positions. Your
                    resilience is a real strength - keep making it tough for your
                    opponents!
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.volatileGames / Math.max(1, analyzedGames) > 0.5 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">🎢</span>
                <div>
                  <h4 className="text-yellow-400 font-medium">
                    Volatile Play Style
                  </h4>
                  <p className="text-yellow-200/80 text-sm mt-1">
                    Your games have lots of ups and downs. While exciting, this
                    can be inconsistent. Consider a more solid approach when
                    appropriate.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estimation Notice */}
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">ℹ️</span>
            <div>
              <h4 className="text-blue-300 font-medium">Estimation Notice</h4>
              <p className="text-blue-200/70 text-sm mt-1">
                Comeback and blown win stats are estimated from error patterns in analyzed games.
                For precise tracking, full position-by-position evaluation history would be needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
