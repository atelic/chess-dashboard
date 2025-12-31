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
