'use client';

import { useState, Fragment } from 'react';
import type { Game, DateStats } from '@/lib/types';
import { calculateDateStats, getGamesForDate } from '@/lib/utils';
import Card from './ui/Card';
import GamesTable from './games/GamesTable';

interface DayPerformanceProps {
  games: Game[];
}

interface DateRowProps {
  stats: DateStats;
  isExpanded: boolean;
  onToggle: () => void;
  games: Game[];
}

function DateRow({ stats, isExpanded, onToggle, games }: DateRowProps) {
  return (
    <Fragment>
      <tr
        className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
          isExpanded ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'
        }`}
        onClick={onToggle}
      >
        <td className="py-3 px-3 text-zinc-500">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </td>
        <td className="py-3 px-3">
          <span className="text-zinc-200">{stats.displayDate}</span>
        </td>
        <td className="py-3 px-3">
          <div className="flex items-center gap-1 font-mono text-sm">
            <span className="text-green-400 font-medium">{stats.wins}</span>
            <span className="text-zinc-600">-</span>
            <span className="text-zinc-400 font-medium">{stats.draws}</span>
            <span className="text-zinc-600">-</span>
            <span className="text-red-400 font-medium">{stats.losses}</span>
          </div>
        </td>
        <td className="py-3 px-3 text-right text-zinc-400">
          {stats.games} {stats.games === 1 ? 'game' : 'games'}
        </td>
        <td className="py-3 px-3 text-right font-mono text-sm">
          {stats.ratingChange !== 0 ? (
            <span className={stats.ratingChange > 0 ? 'text-green-400' : 'text-red-400'}>
              {stats.ratingChange > 0 ? '+' : ''}{stats.ratingChange}
            </span>
          ) : (
            <span className="text-zinc-500">0</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-zinc-800/20 p-4">
            <GamesTable games={games} maxRows={20} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function DayPerformance({ games }: DayPerformanceProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const dateStats = calculateDateStats(games);

  const handleToggle = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  if (dateStats.length === 0) {
    return (
      <Card title="Daily Performance">
        <div className="text-center py-8 text-zinc-500">
          No games to display
        </div>
      </Card>
    );
  }

  return (
    <Card title="Daily Performance" subtitle="Click a date to view games">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 px-3 text-zinc-400 font-medium w-8"></th>
              <th className="text-left py-2 px-3 text-zinc-400 font-medium">Date</th>
              <th className="text-left py-2 px-3 text-zinc-400 font-medium">W-D-L</th>
              <th className="text-right py-2 px-3 text-zinc-400 font-medium">Total</th>
              <th className="text-right py-2 px-3 text-zinc-400 font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {dateStats.map((stats) => (
              <DateRow
                key={stats.date}
                stats={stats}
                isExpanded={expandedDate === stats.date}
                onToggle={() => handleToggle(stats.date)}
                games={expandedDate === stats.date ? getGamesForDate(games, stats.date) : []}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
