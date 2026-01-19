'use client';

import { useMemo } from 'react';
import type { Game } from '@/lib/types';
import {
  calculateStats,
  calculateWinRateOverTime,
  calculateRatingProgression,
  calculateTimeControlDistribution,
  calculateColorPerformance,
  generateInsights,
} from '@/lib/utils';

// New dashboard components
import HeroMetrics from '@/components/dashboard/HeroMetrics';
import ActionableInsights from '@/components/dashboard/ActionableInsights';
import RecentGamesCompact from '@/components/dashboard/RecentGamesCompact';
import QuickStats from '@/components/dashboard/QuickStats';

// Existing chart components
import OpeningsChart from '../OpeningsChart';
import RatingChart from '../RatingChart';
import TimeControlChart from '../TimeControlChart';
import ColorPerformanceChart from '../ColorPerformanceChart';
import WinRateChart from '../WinRateChart';

interface OverviewTabProps {
  games: Game[];
  isAllTime?: boolean;
}

export default function OverviewTab({ games, isAllTime = false }: OverviewTabProps) {
  // Memoize expensive calculations
  const stats = useMemo(() => calculateStats(games), [games]);
  const insights = useMemo(() => generateInsights(games), [games]);

  const ratingData = useMemo(
    () => calculateRatingProgression(games, { excludeProvisional: isAllTime }),
    [games, isAllTime]
  );
  const timeControlData = useMemo(() => calculateTimeControlDistribution(games), [games]);
  const colorPerformanceData = useMemo(() => calculateColorPerformance(games), [games]);
  const winRateData = useMemo(() => calculateWinRateOverTime(games), [games]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Metrics Row */}
      <HeroMetrics stats={stats} games={games} />

      {/* Rating Progression - full width */}
      <RatingChart data={ratingData} />

      {/* Key Insights */}
      <ActionableInsights insights={insights} maxItems={4} />

      {/* Results by Opening - full width */}
      <OpeningsChart games={games} />

      {/* Recent Games & Play Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentGamesCompact games={games} maxGames={5} />
        <QuickStats games={games} />
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TimeControlChart data={timeControlData} />
        <ColorPerformanceChart data={colorPerformanceData} />
        <WinRateChart data={winRateData} />
      </div>
    </div>
  );
}
