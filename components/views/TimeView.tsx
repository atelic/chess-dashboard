'use client';

import { useMemo } from 'react';
import type { Game } from '@/lib/types';
import { Clock, Sun, Moon, Timer, Calendar } from 'lucide-react';
import CommandPanel, { MetricCard, ProgressBar } from '@/components/layout/CommandPanel';
import { cn } from '@/lib/utils';

interface TimeViewProps {
  games: Game[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimeView({ games }: TimeViewProps) {
  // Calculate hourly stats locally (uses local time via Date.getHours())
  const hourlyStats = useMemo(() => {
    const stats: Record<number, { games: number; wins: number }> = {};
    for (let i = 0; i < 24; i++) {
      stats[i] = { games: 0, wins: 0 };
    }
    games.forEach((game) => {
      // playedAt is a Date object, getHours() returns local hour
      const hour = game.playedAt.getHours();
      stats[hour].games++;
      if (game.result === 'win') stats[hour].wins++;
    });
    return Object.entries(stats).map(([hour, data]) => ({
      hour: parseInt(hour),
      games: data.games,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    }));
  }, [games]);

  // Calculate day of week stats locally (uses local time via Date.getDay())
  const dayStats = useMemo(() => {
    const stats: Record<number, { games: number; wins: number }> = {};
    for (let i = 0; i < 7; i++) {
      stats[i] = { games: 0, wins: 0 };
    }
    games.forEach((game) => {
      // playedAt is a Date object, getDay() returns local day of week
      const day = game.playedAt.getDay();
      stats[day].games++;
      if (game.result === 'win') stats[day].wins++;
    });
    return Object.entries(stats).map(([day, data]) => ({
      day: parseInt(day),
      games: data.games,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    }));
  }, [games]);

  // Find best and worst hours
  const bestHour = useMemo(() => {
    const validHours = hourlyStats.filter((h) => h.games >= 5);
    if (validHours.length === 0) return null;
    return validHours.reduce((best, curr) =>
      curr.winRate > best.winRate ? curr : best
    );
  }, [hourlyStats]);

  const worstHour = useMemo(() => {
    const validHours = hourlyStats.filter((h) => h.games >= 5);
    if (validHours.length === 0) return null;
    return validHours.reduce((worst, curr) =>
      curr.winRate < worst.winRate ? curr : worst
    );
  }, [hourlyStats]);

  // Find best day
  const bestDay = useMemo(() => {
    const validDays = dayStats.filter((d) => d.games >= 5);
    if (validDays.length === 0) return null;
    return validDays.reduce((best, curr) =>
      curr.winRate > best.winRate ? curr : best
    );
  }, [dayStats]);

  // Calculate timeout rate
  const timeoutRate = useMemo(() => {
    const losses = games.filter((g) => g.result === 'loss');
    if (losses.length === 0) return 0;
    const timeouts = losses.filter((g) => g.termination === 'timeout');
    return (timeouts.length / losses.length) * 100;
  }, [games]);

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  // Get win rate color
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'bg-green-500';
    if (winRate >= 55) return 'bg-green-400';
    if (winRate >= 50) return 'bg-yellow-500';
    if (winRate >= 45) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Time Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Discover when you play your best chess
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Best Time"
          value={bestHour ? formatHour(bestHour.hour) : '-'}
          subValue={bestHour ? `${bestHour.winRate.toFixed(0)}% win rate` : undefined}
          icon={<Sun className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          label="Worst Time"
          value={worstHour ? formatHour(worstHour.hour) : '-'}
          subValue={worstHour ? `${worstHour.winRate.toFixed(0)}% win rate` : undefined}
          icon={<Moon className="w-5 h-5" />}
          trend="down"
        />
        <MetricCard
          label="Best Day"
          value={bestDay ? DAYS[bestDay.day] : '-'}
          subValue={bestDay ? `${bestDay.winRate.toFixed(0)}% win rate` : undefined}
          icon={<Calendar className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          label="Timeout Rate"
          value={`${timeoutRate.toFixed(1)}%`}
          subValue={timeoutRate > 15 ? 'Consider slower time controls' : 'of losses'}
          icon={<Timer className="w-5 h-5" />}
          trend={timeoutRate > 15 ? 'down' : 'neutral'}
        />
      </div>

      {/* Heatmap */}
      <CommandPanel
        title="Performance Heatmap"
        description="Win rate by hour (min. 3 games)"
        icon={<Clock className="w-5 h-5" />}
      >
        <div className="overflow-x-auto">
          {/* Hour labels */}
          <div className="flex gap-1 mb-2 pl-2">
            {[0, 4, 8, 12, 16, 20].map((hour) => (
              <div
                key={hour}
                className="text-[10px] text-muted-foreground"
                style={{ width: `${(100 / 24) * 4}%`, minWidth: '40px' }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Single row heatmap by hour */}
          <div className="flex gap-0.5">
            {hourlyStats.map((hourData) => {
              const hasData = hourData.games >= 3;
              return (
                <div
                  key={hourData.hour}
                  className={cn(
                    'flex-1 h-12 rounded-sm transition-colors min-w-[20px]',
                    hasData ? getWinRateColor(hourData.winRate) : 'bg-secondary/50'
                  )}
                  style={{ opacity: hasData ? 0.3 + (hourData.winRate / 100) * 0.7 : 0.2 }}
                  title={
                    hasData
                      ? `${formatHour(hourData.hour)}: ${hourData.winRate.toFixed(0)}% (${hourData.games} games)`
                      : `${formatHour(hourData.hour)}: Not enough games`
                  }
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
            <span>Win rate:</span>
            <div className="flex items-center gap-1">
              <span>Low</span>
              <div className="w-4 h-4 rounded-sm bg-red-500 opacity-50" />
              <div className="w-4 h-4 rounded-sm bg-orange-500 opacity-60" />
              <div className="w-4 h-4 rounded-sm bg-yellow-500 opacity-70" />
              <div className="w-4 h-4 rounded-sm bg-green-400 opacity-80" />
              <div className="w-4 h-4 rounded-sm bg-green-500 opacity-90" />
              <span>High</span>
            </div>
          </div>
        </div>
      </CommandPanel>

      {/* Day of Week Performance */}
      <CommandPanel
        title="Day of Week Performance"
        description="Your win rate by day"
        icon={<Calendar className="w-5 h-5" />}
      >
        <div className="space-y-4">
          {dayStats.map((day) => {
            const winRateColor =
              day.winRate >= 55 ? 'success' : day.winRate >= 45 ? 'warning' : 'danger';
            return (
              <div key={day.day} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium">{DAYS[day.day]}</div>
                <div className="flex-1">
                  <ProgressBar
                    value={day.winRate}
                    color={winRateColor}
                    size="md"
                    showValue
                  />
                </div>
                <div className="w-20 text-right text-sm text-muted-foreground">
                  {day.games} games
                </div>
              </div>
            );
          })}
        </div>
      </CommandPanel>
    </div>
  );
}
