'use client';

import { useMemo } from 'react';
import type { Game } from '@/lib/types';
import {
  calculateStats,
  calculateWinRateOverTime,
  calculateOpeningStats,
  calculateRatingProgression,
  calculateTimeControlDistribution,
  calculateColorPerformance,
} from '@/lib/utils';
import StatsOverview from '../StatsOverview';
import WinRateChart from '../WinRateChart';
import OpeningsChart from '../OpeningsChart';
import RatingChart from '../RatingChart';
import TimeControlChart from '../TimeControlChart';
import ColorPerformanceChart from '../ColorPerformanceChart';

interface OverviewTabProps {
  games: Game[];
}

export default function OverviewTab({ games }: OverviewTabProps) {
  // Memoize expensive calculations to prevent recalculation on every render
  const stats = useMemo(() => calculateStats(games), [games]);
  const winRateData = useMemo(() => calculateWinRateOverTime(games), [games]);
  const openingData = useMemo(() => calculateOpeningStats(games), [games]);
  const ratingData = useMemo(() => calculateRatingProgression(games), [games]);
  const timeControlData = useMemo(() => calculateTimeControlDistribution(games), [games]);
  const colorPerformanceData = useMemo(() => calculateColorPerformance(games), [games]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Rating Progression - prominent, full width */}
      <RatingChart data={ratingData} />

      {/* Results by Opening - full width for readability */}
      <OpeningsChart data={openingData} />

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TimeControlChart data={timeControlData} />
        <ColorPerformanceChart data={colorPerformanceData} />
        <WinRateChart data={winRateData} />
      </div>
    </div>
  );
}
