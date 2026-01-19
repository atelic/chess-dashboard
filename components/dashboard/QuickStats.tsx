'use client';

import * as React from 'react';
import { Clock, Calendar, Target, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  findPeakPerformanceTimes,
  calculateDayOfWeekStats,
  calculateTimeControlDistribution,
} from '@/lib/utils';
import type { Game } from '@/lib/types';

interface QuickStatsProps {
  games: Game[];
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}

function StatItem({ icon, label, value, subValue, highlight }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
      <div className={cn(
        'p-2 rounded-lg',
        highlight ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
      )} aria-hidden="true">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

export function QuickStats({ games, className }: QuickStatsProps) {
  const stats = React.useMemo(() => {
    // Peak performance time
    const peakTime = findPeakPerformanceTimes(games, 5);

    // Best day of week
    const dayStats = calculateDayOfWeekStats(games);
    const bestDay = dayStats
      .filter(d => d.games >= 5)
      .sort((a, b) => b.winRate - a.winRate)[0];

    // Favorite time control
    const timeControlStats = calculateTimeControlDistribution(games);
    const favoriteTimeControl = timeControlStats.sort((a, b) => b.count - a.count)[0];

    // Calculate average rating of opponents
    const avgOpponentRating = games.length > 0
      ? Math.round(games.reduce((sum, g) => sum + g.opponent.rating, 0) / games.length)
      : 0;

    return {
      peakTime,
      bestDay,
      favoriteTimeControl,
      avgOpponentRating,
    };
  }, [games]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Play Patterns</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {stats.peakTime && (
          <StatItem
            icon={<Clock className="h-4 w-4" />}
            label="Peak Performance"
            value={stats.peakTime.label}
            subValue={`${stats.peakTime.winRate.toFixed(0)}% win rate`}
            highlight
          />
        )}

        {stats.bestDay && (
          <StatItem
            icon={<Calendar className="h-4 w-4" />}
            label="Best Day"
            value={stats.bestDay.dayName}
            subValue={`${stats.bestDay.winRate.toFixed(0)}% win rate (${stats.bestDay.games} games)`}
          />
        )}

        {stats.favoriteTimeControl && (
          <StatItem
            icon={<Zap className="h-4 w-4" />}
            label="Most Played"
            value={stats.favoriteTimeControl.timeClass.charAt(0).toUpperCase() + stats.favoriteTimeControl.timeClass.slice(1)}
            subValue={`${stats.favoriteTimeControl.count} games (${stats.favoriteTimeControl.percentage.toFixed(0)}%)`}
          />
        )}

        <StatItem
          icon={<Target className="h-4 w-4" />}
          label="Avg Opponent"
          value={stats.avgOpponentRating.toLocaleString()}
          subValue="rating"
        />
      </CardContent>
    </Card>
  );
}

export default QuickStats;
