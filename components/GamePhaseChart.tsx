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
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { Game, GamePhase } from '@/lib/types';
import { calculatePhasePerformance, getPhaseLabel } from '@/lib/utils';
import Card from './ui/Card';

interface GamePhaseChartProps {
  games: Game[];
}

const PHASE_COLORS: Record<GamePhase, string> = {
  opening: '#3b82f6', // blue
  middlegame: '#8b5cf6', // purple
  endgame: '#22c55e', // green
};

const ERROR_COLORS = {
  blunders: '#ef4444', // red
  mistakes: '#f97316', // orange
  inaccuracies: '#eab308', // yellow
};

export default function GamePhaseChart({ games }: GamePhaseChartProps) {
  const phasePerf = useMemo(() => calculatePhasePerformance(games), [games]);

  if (phasePerf.gamesAnalyzed === 0) {
    return (
      <Card
        title="Game Phase Analysis"
        subtitle="Performance by opening, middlegame, and endgame"
      >
        <div className="h-64 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <p>No analysis data available</p>
            <p className="text-sm mt-1">Analyze some games to see phase performance</p>
          </div>
        </div>
      </Card>
    );
  }

  // Prepare data for charts
  const errorData = [
    {
      phase: 'Opening',
      blunders: phasePerf.opening.blunders,
      mistakes: phasePerf.opening.mistakes,
      inaccuracies: phasePerf.opening.inaccuracies,
    },
    {
      phase: 'Middlegame',
      blunders: phasePerf.middlegame.blunders,
      mistakes: phasePerf.middlegame.mistakes,
      inaccuracies: phasePerf.middlegame.inaccuracies,
    },
    {
      phase: 'Endgame',
      blunders: phasePerf.endgame.blunders,
      mistakes: phasePerf.endgame.mistakes,
      inaccuracies: phasePerf.endgame.inaccuracies,
    },
  ];

  // Calculate total errors per phase for pie chart
  const totalErrors = (phase: typeof phasePerf.opening) =>
    phase.blunders + phase.mistakes + phase.inaccuracies;

  const pieData = [
    { name: 'Opening', value: totalErrors(phasePerf.opening), color: PHASE_COLORS.opening },
    { name: 'Middlegame', value: totalErrors(phasePerf.middlegame), color: PHASE_COLORS.middlegame },
    { name: 'Endgame', value: totalErrors(phasePerf.endgame), color: PHASE_COLORS.endgame },
  ].filter(d => d.value > 0);

  return (
    <Card
      title="Game Phase Analysis"
      subtitle={`Based on ${phasePerf.gamesAnalyzed} analyzed games`}
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Weakest Phase</div>
            <div className="text-xl font-semibold text-red-400 mt-1">
              {getPhaseLabel(phasePerf.weakestPhase)}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Strongest Phase</div>
            <div className="text-xl font-semibold text-green-400 mt-1">
              {getPhaseLabel(phasePerf.strongestPhase)}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Total Blunders</div>
            <div className="text-xl font-semibold text-zinc-100 mt-1">
              {phasePerf.opening.blunders + phasePerf.middlegame.blunders + phasePerf.endgame.blunders}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Games Analyzed</div>
            <div className="text-xl font-semibold text-zinc-100 mt-1">
              {phasePerf.gamesAnalyzed}
            </div>
          </div>
        </div>

        {/* Phase Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['opening', 'middlegame', 'endgame'] as GamePhase[]).map((phase) => {
            const stats = phasePerf[phase];
            const isWeakest = phase === phasePerf.weakestPhase;
            const isStrongest = phase === phasePerf.strongestPhase;
            
            return (
              <div
                key={phase}
                className={`p-4 rounded-lg border ${
                  isWeakest
                    ? 'bg-red-950/30 border-red-900/50'
                    : isStrongest
                    ? 'bg-green-950/30 border-green-900/50'
                    : 'bg-zinc-800/50 border-zinc-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-zinc-200">{getPhaseLabel(phase)}</h4>
                  {isWeakest && <span className="text-xs text-red-400 bg-red-950 px-2 py-1 rounded">Needs work</span>}
                  {isStrongest && <span className="text-xs text-green-400 bg-green-950 px-2 py-1 rounded">Strong</span>}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Blunders</span>
                    <span className="text-red-400 font-medium">{stats.blunders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Mistakes</span>
                    <span className="text-orange-400 font-medium">{stats.mistakes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Inaccuracies</span>
                    <span className="text-yellow-400 font-medium">{stats.inaccuracies}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Distribution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Errors by Phase</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={errorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="phase" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="blunders" name="Blunders" fill={ERROR_COLORS.blunders} />
                <Bar dataKey="mistakes" name="Mistakes" fill={ERROR_COLORS.mistakes} />
                <Bar dataKey="inaccuracies" name="Inaccuracies" fill={ERROR_COLORS.inaccuracies} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {pieData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Error Distribution</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
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
                    formatter={(value) => [`${value} errors`, 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {phasePerf.weakestPhase && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <h4 className="text-blue-400 font-medium">Focus Area</h4>
                <p className="text-blue-200/80 text-sm mt-1">
                  {phasePerf.weakestPhase === 'opening' &&
                    'Your opening play needs work. Study opening principles and build a solid repertoire.'}
                  {phasePerf.weakestPhase === 'middlegame' &&
                    'Most of your errors occur in the middlegame. Practice tactics and strategic planning.'}
                  {phasePerf.weakestPhase === 'endgame' &&
                    'Your endgame technique needs improvement. Study basic endgame patterns and practice converting advantages.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
