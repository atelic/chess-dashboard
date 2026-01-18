'use client';

import { useMemo } from 'react';
import type { Game } from '@/lib/types';
import {
  calculateStats,
  calculateColorPerformance,
  calculateTerminationStats,
} from '@/lib/utils';
import {
  Target,
  Brain,
  Swords,
  Flag,
  Clock,
} from 'lucide-react';
import CommandPanel, { MetricCard, ProgressBar } from '@/components/layout/CommandPanel';

interface PerformanceViewProps {
  games: Game[];
}

export default function PerformanceView({ games }: PerformanceViewProps) {
  // Calculate performance stats
  const stats = useMemo(() => calculateStats(games), [games]);
  const colorPerf = useMemo(() => calculateColorPerformance(games), [games]);
  const terminations = useMemo(() => calculateTerminationStats(games), [games]);

  // Find color with better performance
  const whiteData = colorPerf.find((c) => c.color === 'white');
  const blackData = colorPerf.find((c) => c.color === 'black');
  const colorDiff = whiteData && blackData ? whiteData.winRate - blackData.winRate : 0;

  // Calculate best time control
  const bestTimeControl = useMemo(() => {
    const timeControls = ['bullet', 'blitz', 'rapid', 'classical'] as const;
    const tcStats = timeControls.map((tc) => {
      const tcGames = games.filter((g) => g.timeClass === tc);
      const wins = tcGames.filter((g) => g.result === 'win').length;
      const winRate = tcGames.length >= 10 ? (wins / tcGames.length) * 100 : 0;
      return { timeClass: tc, games: tcGames.length, winRate };
    }).filter((tc) => tc.games >= 10);

    if (tcStats.length === 0) return null;
    return tcStats.reduce((best, curr) =>
      curr.winRate > best.winRate ? curr : best
    );
  }, [games]);

  // Calculate white/black game counts
  const whiteGames = games.filter((g) => g.playerColor === 'white');
  const blackGames = games.filter((g) => g.playerColor === 'black');
  const whiteWins = whiteGames.filter((g) => g.result === 'win').length;
  const blackWins = blackGames.filter((g) => g.result === 'win').length;
  const whiteDraws = whiteGames.filter((g) => g.result === 'draw').length;
  const blackDraws = blackGames.filter((g) => g.result === 'draw').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Performance Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Deep dive into your chess performance metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Overall Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          subValue={`${stats.wins}W - ${stats.losses}L - ${stats.draws}D`}
          icon={<Target className="w-5 h-5" />}
          trend={stats.winRate >= 50 ? 'up' : 'down'}
        />
        <MetricCard
          label="Total Games"
          value={stats.totalGames.toLocaleString()}
          icon={<Brain className="w-5 h-5" />}
        />
        <MetricCard
          label="Best Color"
          value={colorDiff > 0 ? 'White' : colorDiff < 0 ? 'Black' : 'Even'}
          subValue={colorDiff !== 0 ? `+${Math.abs(colorDiff).toFixed(1)}% win rate` : undefined}
          icon={<Swords className="w-5 h-5" />}
        />
        <MetricCard
          label="Best Format"
          value={bestTimeControl?.timeClass || '-'}
          subValue={bestTimeControl ? `${bestTimeControl.winRate.toFixed(0)}% win rate` : undefined}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Color Performance */}
      <CommandPanel
        title="Color Performance"
        description="Your win rate as White vs Black"
        icon={<Swords className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* White */}
          <div className="p-4 rounded-lg bg-foreground/5 border border-foreground/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-foreground border border-border" />
              <div>
                <div className="font-medium">As White</div>
                <div className="text-sm text-muted-foreground">
                  {whiteGames.length} games
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold mb-2">
              {whiteData?.winRate.toFixed(1) || 0}%
            </div>
            <ProgressBar
              value={whiteData?.winRate || 0}
              color={whiteData && whiteData.winRate >= 50 ? 'success' : 'danger'}
              size="lg"
              showValue={false}
            />
            <div className="mt-2 text-sm text-muted-foreground">
              {whiteWins}W - {whiteGames.length - whiteWins - whiteDraws}L - {whiteDraws}D
            </div>
          </div>

          {/* Black */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-secondary border border-muted-foreground" />
              <div>
                <div className="font-medium">As Black</div>
                <div className="text-sm text-muted-foreground">
                  {blackGames.length} games
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold mb-2">
              {blackData?.winRate.toFixed(1) || 0}%
            </div>
            <ProgressBar
              value={blackData?.winRate || 0}
              color={blackData && blackData.winRate >= 50 ? 'success' : 'danger'}
              size="lg"
              showValue={false}
            />
            <div className="mt-2 text-sm text-muted-foreground">
              {blackWins}W - {blackGames.length - blackWins - blackDraws}L - {blackDraws}D
            </div>
          </div>
        </div>
      </CommandPanel>

      {/* How Games End */}
      <CommandPanel
        title="How Your Games End"
        description="Termination breakdown"
        icon={<Flag className="w-5 h-5" />}
      >
        {terminations.length > 0 ? (
          <div className="space-y-4">
            {terminations.map((term) => {
              const total = term.asWinner + term.asLoser;
              if (total === 0) return null;
              return (
                <div key={term.termination} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium capitalize">
                    {term.label}
                  </div>
                  <div className="flex-1">
                    <div className="flex h-6 rounded overflow-hidden bg-secondary">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(term.asWinner / total) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(term.asLoser / total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-green-400 text-sm">{term.asWinner}W</span>
                    <span className="text-muted-foreground text-sm"> / </span>
                    <span className="text-red-400 text-sm">{term.asLoser}L</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not enough data</p>
        )}
      </CommandPanel>

      {/* Time Control Breakdown */}
      <CommandPanel
        title="Performance by Time Control"
        description="Win rate across different formats"
        icon={<Clock className="w-5 h-5" />}
      >
        <div className="space-y-4">
          {(['bullet', 'blitz', 'rapid', 'classical'] as const).map((tc) => {
            const tcGames = games.filter((g) => g.timeClass === tc);
            const wins = tcGames.filter((g) => g.result === 'win').length;
            const winRate = tcGames.length > 0 ? (wins / tcGames.length) * 100 : 0;
            const winRateColor =
              winRate >= 55 ? 'success' : winRate >= 45 ? 'warning' : 'danger';

            return (
              <div key={tc} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium capitalize">{tc}</div>
                <div className="flex-1">
                  <ProgressBar
                    value={winRate}
                    color={tcGames.length >= 5 ? winRateColor : 'primary'}
                    size="md"
                    showValue
                  />
                </div>
                <div className="w-24 text-right text-sm text-muted-foreground">
                  {tcGames.length} games
                </div>
              </div>
            );
          })}
        </div>
      </CommandPanel>
    </div>
  );
}
