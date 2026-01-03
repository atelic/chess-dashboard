'use client';

import { memo, useMemo } from 'react';
import type { UserStats } from '@/lib/types';
import Card from './ui/Card';

interface StatsOverviewProps {
  stats: UserStats;
}

const StatsOverview = memo(function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      label: 'Total Games',
      value: stats.totalGames,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Wins',
      value: stats.wins,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Losses',
      value: stats.losses,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Draws',
      value: stats.draws,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className={`${stat.bgColor} border-transparent`}>
          <div className="text-center">
            <p className="text-sm text-zinc-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
});

export default StatsOverview;
