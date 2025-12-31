'use client';

import type { Game } from '@/lib/types';
import {
  calculateStats,
  calculateWinRateOverTime,
  calculateOpeningStats,
  calculateRatingProgression,
  calculateTimeControlDistribution,
  calculateColorPerformance,
} from '@/lib/utils';
import StatsOverview from './StatsOverview';
import WinRateChart from './WinRateChart';
import OpeningsChart from './OpeningsChart';
import RatingChart from './RatingChart';
import TimeControlChart from './TimeControlChart';
import ColorPerformanceChart from './ColorPerformanceChart';
import Spinner from './ui/Spinner';

interface DashboardProps {
  games: Game[];
  isLoading: boolean;
}

export default function Dashboard({ games, isLoading }: DashboardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner size="lg" />
        <p className="mt-4 text-zinc-400">Loading games...</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="w-16 h-16 text-zinc-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-zinc-300 mb-2">No games to display</h3>
        <p className="text-zinc-500 max-w-md">
          Enter your Chess.com or Lichess username above to analyze your games.
        </p>
      </div>
    );
  }

  // Calculate all stats and chart data
  const stats = calculateStats(games);
  const winRateData = calculateWinRateOverTime(games);
  const openingData = calculateOpeningStats(games);
  const ratingData = calculateRatingProgression(games);
  const timeControlData = calculateTimeControlDistribution(games);
  const colorPerformanceData = calculateColorPerformance(games);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WinRateChart data={winRateData} />
        <OpeningsChart data={openingData} />
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RatingChart data={ratingData} />
        <TimeControlChart data={timeControlData} />
        <ColorPerformanceChart data={colorPerformanceData} />
      </div>
    </div>
  );
}
