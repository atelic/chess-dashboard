'use client';

import { useMemo } from 'react';
import type { Game } from '@/lib/types';
import {
  calculateStats,
  calculateOpeningStats,
  calculateRatingProgression,
  generateInsights,
} from '@/lib/utils';
import {
  Crown,
  Target,
  Gamepad2,
  Flame,
  TrendingUp,
  Clock,
  Lightbulb,
} from 'lucide-react';
import CommandPanel, { MetricCard } from '@/components/layout/CommandPanel';
import RatingChart from '@/components/RatingChart';
import OpeningsChart from '@/components/OpeningsChart';
import RecentGamesCompact from '@/components/dashboard/RecentGamesCompact';

interface OverviewViewProps {
  games: Game[];
  isAllTime?: boolean;
}

export default function OverviewView({ games, isAllTime = false }: OverviewViewProps) {
  // Memoize expensive calculations
  const stats = useMemo(() => calculateStats(games), [games]);
  const insights = useMemo(() => generateInsights(games), [games]);
  const openingData = useMemo(() => calculateOpeningStats(games), [games]);
  const ratingData = useMemo(
    () => calculateRatingProgression(games, { excludeProvisional: isAllTime }),
    [games, isAllTime]
  );

  // Find highest rating (excluding unrated games and provisional ratings when viewing all time)
  const highestRating = useMemo(() => {
    // Only consider rated games for peak rating
    const ratedGames = games.filter((game) => game.rated);
    if (ratedGames.length === 0) return { rating: 0, source: '', timeClass: '' };

    // When viewing all time, exclude the first game for each source+timeClass combo
    // as those have provisional ratings that aren't representative
    let gamesToCheck = ratedGames;
    if (isAllTime) {
      const sorted = [...ratedGames].sort(
        (a, b) => a.playedAt.getTime() - b.playedAt.getTime()
      );
      const firstGameKeys = new Set<string>();
      gamesToCheck = sorted.filter((game) => {
        const key = `${game.source}-${game.timeClass}`;
        if (!firstGameKeys.has(key)) {
          firstGameKeys.add(key);
          return false; // Skip first game of each combo
        }
        return true;
      });
    }

    // If all games were filtered out, use rated games
    if (gamesToCheck.length === 0) gamesToCheck = ratedGames;

    let max = { rating: 0, source: '', timeClass: '' };
    gamesToCheck.forEach((game) => {
      if (game.playerRating > max.rating) {
        max = {
          rating: game.playerRating,
          source: game.source,
          timeClass: game.timeClass,
        };
      }
    });
    return max;
  }, [games, isAllTime]);

  // Calculate current streak
  const currentStreak = useMemo(() => {
    if (games.length === 0) return { type: 'none', count: 0 };
    const sorted = [...games].sort(
      (a, b) => b.playedAt.getTime() - a.playedAt.getTime()
    );
    const firstResult = sorted[0].result;
    if (firstResult === 'draw') return { type: 'none', count: 0 };

    let count = 0;
    for (const game of sorted) {
      if (game.result === firstResult) {
        count++;
      } else {
        break;
      }
    }
    return { type: firstResult, count };
  }, [games]);

  const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Your chess performance at a glance</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Peak Rating"
          value={String(highestRating.rating)}
          subValue={highestRating.source ? `${highestRating.source} ${highestRating.timeClass}` : undefined}
          icon={<Crown className="w-5 h-5" />}
        />
        <MetricCard
          label="Win Rate"
          value={`${winRate}%`}
          subValue={`${stats.wins}W - ${stats.losses}L - ${stats.draws}D`}
          icon={<Target className="w-5 h-5" />}
          trend={Number(winRate) >= 50 ? 'up' : 'down'}
        />
        <MetricCard
          label="Total Games"
          value={stats.totalGames.toLocaleString()}
          icon={<Gamepad2 className="w-5 h-5" />}
        />
        <MetricCard
          label="Current Streak"
          value={
            currentStreak.type === 'none'
              ? '-'
              : `${currentStreak.count}${currentStreak.type === 'win' ? 'W' : 'L'}`
          }
          icon={<Flame className="w-5 h-5" />}
          trend={
            currentStreak.type === 'win'
              ? 'up'
              : currentStreak.type === 'loss'
              ? 'down'
              : 'neutral'
          }
        />
      </div>

      {/* Rating Chart */}
      <CommandPanel
        title="Rating Progression"
        description="Track your rating changes over time"
        icon={<TrendingUp className="w-5 h-5" />}
      >
        <RatingChart data={ratingData} />
      </CommandPanel>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Insights */}
        <CommandPanel
          title="Quick Insights"
          description="Key observations from your games"
          icon={<Lightbulb className="w-5 h-5" />}
          badge={insights.length > 0 ? { text: `${insights.length}`, variant: 'info' } : undefined}
        >
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.slice(0, 5).map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mt-1.5 shrink-0',
                      insight.type === 'positive' && 'bg-green-500',
                      insight.type === 'negative' && 'bg-red-500',
                      insight.type === 'neutral' && 'bg-muted-foreground',
                      insight.type === 'warning' && 'bg-yellow-500'
                    )}
                  />
                  <div>
                    <p className="text-sm text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Play more games to see insights</p>
          )}
        </CommandPanel>

        {/* Recent Games */}
        <CommandPanel
          title="Recent Activity"
          description="Your latest games"
          icon={<Clock className="w-5 h-5" />}
        >
          <RecentGamesCompact games={games} maxGames={5} />
        </CommandPanel>
      </div>

      {/* Openings Chart */}
      <CommandPanel
        title="Opening Performance"
        description="Win rates by opening"
        icon={<Target className="w-5 h-5" />}
      >
        <OpeningsChart data={openingData} />
      </CommandPanel>
    </div>
  );
}

// Helper for conditional classes
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
