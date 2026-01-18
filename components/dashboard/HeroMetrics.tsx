'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus, Flame, Snowflake } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn, calculateCurrentStreak } from '@/lib/utils';
import { KingIcon } from '@/components/icons/ChessPieces';
import type { UserStats, Game } from '@/lib/types';

interface HeroMetricsProps {
  stats: UserStats;
  games: Game[];
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

function MetricCard({ label, value, subValue, trend, trendValue, icon, className }: MetricCardProps) {
  return (
    <Card className={cn('p-5 text-center relative overflow-hidden', className)}>
      {icon && (
        <div className="absolute top-3 right-3 text-muted-foreground/30">
          {icon}
        </div>
      )}
      <p className="text-h3 text-muted-foreground mb-1">{label}</p>
      <p className="text-display text-foreground tabular-nums">{value}</p>
      {(subValue || trendValue) && (
        <div className="flex items-center justify-center gap-1 mt-1">
          {trend && (
            <span className={cn(
              'flex items-center',
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-destructive',
              trend === 'neutral' && 'text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
            </span>
          )}
          <span className={cn(
            'text-small',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-destructive',
            !trend && 'text-muted-foreground'
          )}>
            {trendValue || subValue}
          </span>
        </div>
      )}
    </Card>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  chesscom: 'Chess.com',
  lichess: 'Lichess',
};

const TIME_CLASS_LABELS: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
};

const MIN_GAMES_FOR_RATING = 5;

export function HeroMetrics({ stats, games, className }: HeroMetricsProps) {
  const highestRatingInfo = React.useMemo(() => {
    if (games.length === 0) return { rating: 0, source: '', timeClass: '' };

    const ratedGames = games.filter(g => g.rated);
    if (ratedGames.length === 0) return { rating: 0, source: '', timeClass: '' };

    const sorted = [...ratedGames].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

    const groupCounts = new Map<string, number>();
    const establishedRatings: { rating: number; source: string; timeClass: string }[] = [];

    for (const game of sorted) {
      const key = `${game.source}-${game.timeClass}`;
      const count = (groupCounts.get(key) || 0) + 1;
      groupCounts.set(key, count);

      if (count > MIN_GAMES_FOR_RATING) {
        establishedRatings.push({
          rating: game.playerRating,
          source: game.source,
          timeClass: game.timeClass,
        });
      }
    }

    if (establishedRatings.length === 0) {
      const fallback = ratedGames.reduce((best, game) =>
        game.playerRating > best.playerRating ? game : best
      );
      return {
        rating: fallback.playerRating,
        source: fallback.source,
        timeClass: fallback.timeClass,
      };
    }

    return establishedRatings.reduce((best, curr) =>
      curr.rating > best.rating ? curr : best
    );
  }, [games]);

  const ratingLabel = React.useMemo(() => {
    if (!highestRatingInfo.source || !highestRatingInfo.timeClass) return '';
    const source = SOURCE_LABELS[highestRatingInfo.source] || highestRatingInfo.source;
    const timeClass = TIME_CLASS_LABELS[highestRatingInfo.timeClass] || highestRatingInfo.timeClass;
    return `${source} ${timeClass}`;
  }, [highestRatingInfo]);

  const currentStreak = React.useMemo(() => calculateCurrentStreak(games), [games]);

  const streakDisplay = React.useMemo(() => {
    if (!currentStreak) {
      return { value: '-', subValue: 'No streak', icon: null };
    }
    const isWinStreak = currentStreak.type === 'win';
    return {
      value: currentStreak.count,
      subValue: `${isWinStreak ? 'Win' : 'Loss'} streak`,
      icon: isWinStreak 
        ? <Flame className="h-8 w-8 text-orange-500/30" />
        : <Snowflake className="h-8 w-8 text-blue-400/30" />,
    };
  }, [currentStreak]);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <MetricCard
        label="Peak Rating"
        value={highestRatingInfo.rating}
        subValue={ratingLabel}
        icon={<KingIcon className="h-8 w-8" />}
      />
      <MetricCard
        label="Win Rate"
        value={`${stats.winRate.toFixed(0)}%`}
        subValue={`${stats.wins}W / ${stats.losses}L / ${stats.draws}D`}
      />
      <MetricCard
        label="Games"
        value={stats.totalGames.toLocaleString()}
        subValue="Total played"
      />
      <MetricCard
        label="Streak"
        value={streakDisplay.value}
        subValue={streakDisplay.subValue}
        icon={streakDisplay.icon}
      />
    </div>
  );
}

export default HeroMetrics;
