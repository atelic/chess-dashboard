'use client';

import { useMemo, useState } from 'react';
import type { Game, OpeningByColorStats } from '@/lib/types';
import {
  calculateOpeningStats,
  calculateOpeningsByColor,
} from '@/lib/utils';
import {
  BookOpen,
  AlertTriangle,
  Trophy,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import CommandPanel, { ProgressBar } from '@/components/layout/CommandPanel';
import { cn } from '@/lib/utils';

interface OpeningsViewProps {
  games: Game[];
}

export default function OpeningsView({ games }: OpeningsViewProps) {
  const [expandedOpening, setExpandedOpening] = useState<string | null>(null);

  // Calculate opening stats
  const openingData = useMemo(() => calculateOpeningStats(games), [games]);

  const whiteOpenings = useMemo(() => {
    const stats = calculateOpeningsByColor(games, 'white');
    return stats.sort((a, b) => b.games - a.games);
  }, [games]);

  const blackOpenings = useMemo(() => {
    const stats = calculateOpeningsByColor(games, 'black');
    return stats.sort((a, b) => b.games - a.games);
  }, [games]);

  const bestOpenings = useMemo(() => {
    // Calculate best openings locally
    const openingMap = new Map<string, { eco: string; name: string; games: number; wins: number; losses: number; draws: number }>();
    games.forEach((g) => {
      if (!g.opening) return;
      // Skip unknown openings
      if (g.opening.eco === 'Unknown' || g.opening.name === 'Unknown Opening') return;
      const key = g.opening.eco;
      const existing = openingMap.get(key) || { eco: g.opening.eco, name: g.opening.name, games: 0, wins: 0, losses: 0, draws: 0 };
      existing.games++;
      if (g.result === 'win') existing.wins++;
      else if (g.result === 'loss') existing.losses++;
      else existing.draws++;
      openingMap.set(key, existing);
    });
    return Array.from(openingMap.values())
      .filter((o) => o.games >= 3)
      .map((o) => ({ ...o, winRate: (o.wins / o.games) * 100 }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);
  }, [games]);

  const worstOpenings = useMemo(() => {
    // Calculate worst openings locally
    const openingMap = new Map<string, { eco: string; name: string; games: number; wins: number; losses: number; draws: number }>();
    games.forEach((g) => {
      if (!g.opening) return;
      // Skip unknown openings
      if (g.opening.eco === 'Unknown' || g.opening.name === 'Unknown Opening') return;
      const key = g.opening.eco;
      const existing = openingMap.get(key) || { eco: g.opening.eco, name: g.opening.name, games: 0, wins: 0, losses: 0, draws: 0 };
      existing.games++;
      if (g.result === 'win') existing.wins++;
      else if (g.result === 'loss') existing.losses++;
      else existing.draws++;
      openingMap.set(key, existing);
    });
    return Array.from(openingMap.values())
      .filter((o) => o.games >= 3)
      .map((o) => ({ ...o, winRate: (o.wins / o.games) * 100 }))
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 5);
  }, [games]);

  // Get games for an opening
  const getOpeningGames = (eco: string, color?: 'white' | 'black') => {
    return games.filter((g) => {
      const matchEco = g.opening?.eco === eco;
      const matchColor = !color || g.playerColor === color;
      return matchEco && matchColor;
    });
  };

  const renderOpeningRow = (opening: OpeningByColorStats, color?: 'white' | 'black') => {
    const key = `${opening.eco}-${color || 'all'}`;
    const isExpanded = expandedOpening === key;
    const openingGames = getOpeningGames(opening.eco, color);
    const winRateColor =
      opening.winRate >= 60 ? 'success' : opening.winRate >= 45 ? 'warning' : 'danger';

    return (
      <div key={key} className="border-b border-border last:border-0">
        <button
          onClick={() => setExpandedOpening(isExpanded ? null : key)}
          className="w-full flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors"
        >
          <span className="text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>

          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{opening.eco}</span>
              <span className="text-sm font-medium text-foreground">{opening.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-medium">{opening.games} games</div>
              <div className="text-xs text-muted-foreground">
                {opening.wins}W - {opening.losses}L - {opening.draws}D
              </div>
            </div>

            <div className="w-24">
              <ProgressBar
                value={opening.winRate}
                color={winRateColor}
                size="sm"
                showValue
              />
            </div>
          </div>
        </button>

        {/* Expanded Games List */}
        {isExpanded && (
          <div className="bg-card/50 border-t border-border p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Recent Games with {opening.name}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {openingGames.slice(0, 10).map((game, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                        game.result === 'win' && 'bg-green-500/20 text-green-400',
                        game.result === 'loss' && 'bg-red-500/20 text-red-400',
                        game.result === 'draw' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                    </span>
                    <div>
                      <div className="text-sm">vs {game.opponent.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {game.playedAt.toLocaleDateString()} · {game.timeClass}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{game.opponent.rating}</span>
                    {game.gameUrl && (
                      <a
                        href={game.gameUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-secondary rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Opening Repertoire</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your opening performance and find areas to improve
        </p>
      </div>

      {/* Highlights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Openings */}
        <CommandPanel
          title="Strongest Openings"
          description="Your highest win rate openings (min. 3 games)"
          icon={<Trophy className="w-5 h-5" />}
          badge={
            bestOpenings.length > 0
              ? { text: `${bestOpenings.length}`, variant: 'success' }
              : undefined
          }
        >
          {bestOpenings.length > 0 ? (
            <div className="space-y-3">
              {bestOpenings.map((opening, i) => (
                <div
                  key={opening.eco}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-400">#{i + 1}</span>
                    <div>
                      <div className="font-medium text-foreground">{opening.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {opening.eco} · {opening.games} games
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {opening.winRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {opening.wins}W-{opening.losses}L-{opening.draws}D
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Not enough games to analyze</p>
          )}
        </CommandPanel>

        {/* Worst Openings - Areas to Improve */}
        <CommandPanel
          title="Needs Improvement"
          description="Openings with lowest win rate (min. 3 games)"
          icon={<AlertTriangle className="w-5 h-5" />}
          badge={
            worstOpenings.length > 0
              ? { text: `${worstOpenings.length}`, variant: 'warning' }
              : undefined
          }
        >
          {worstOpenings.length > 0 ? (
            <div className="space-y-3">
              {worstOpenings.map((opening, i) => (
                <div
                  key={opening.eco}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-red-400">#{i + 1}</span>
                    <div>
                      <div className="font-medium text-foreground">{opening.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {opening.eco} · {opening.games} games
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">
                      {opening.winRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {opening.wins}W-{opening.losses}L-{opening.draws}D
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Not enough games to analyze</p>
          )}
        </CommandPanel>
      </div>

      {/* Openings by Color */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* White Openings */}
        <CommandPanel
          title="As White"
          description="Your opening repertoire with the white pieces"
          icon={
            <div className="w-5 h-5 rounded-sm bg-foreground border border-border" />
          }
          badge={{ text: `${whiteOpenings.length}`, variant: 'info' }}
        >
          <div className="max-h-96 overflow-y-auto -mx-5 -mb-5">
            {whiteOpenings.length > 0 ? (
              whiteOpenings.map((opening) => renderOpeningRow(opening, 'white'))
            ) : (
              <p className="text-muted-foreground text-sm p-5">No games found</p>
            )}
          </div>
        </CommandPanel>

        {/* Black Openings */}
        <CommandPanel
          title="As Black"
          description="Your opening repertoire with the black pieces"
          icon={
            <div className="w-5 h-5 rounded-sm bg-secondary border border-muted-foreground" />
          }
          badge={{ text: `${blackOpenings.length}`, variant: 'info' }}
        >
          <div className="max-h-96 overflow-y-auto -mx-5 -mb-5">
            {blackOpenings.length > 0 ? (
              blackOpenings.map((opening) => renderOpeningRow(opening, 'black'))
            ) : (
              <p className="text-muted-foreground text-sm p-5">No games found</p>
            )}
          </div>
        </CommandPanel>
      </div>

      {/* Full Opening Table */}
      <CommandPanel
        title="All Openings"
        description="Complete list of openings you've played"
        icon={<BookOpen className="w-5 h-5" />}
        collapsible
        defaultCollapsed
      >
        <div className="max-h-[500px] overflow-y-auto -mx-5 -mb-5">
          {openingData.length > 0 ? (
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Opening</th>
                  <th className="p-4 text-right">Games</th>
                  <th className="p-4 text-right">W-L-D</th>
                  <th className="p-4 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {openingData.map((opening) => {
                  const winRate = opening.total > 0 ? (opening.wins / opening.total) * 100 : 0;
                  return (
                    <tr
                      key={opening.eco}
                      className="border-t border-border hover:bg-secondary/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {opening.eco}
                          </span>
                          <span className="text-sm">{opening.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-sm">{opening.total}</td>
                      <td className="p-4 text-right text-sm text-muted-foreground">
                        {opening.wins}-{opening.losses}-{opening.draws}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            winRate >= 60 && 'text-green-400',
                            winRate >= 45 && winRate < 60 && 'text-yellow-400',
                            winRate < 45 && 'text-red-400'
                          )}
                        >
                          {winRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground text-sm p-5">No openings data available</p>
          )}
        </div>
      </CommandPanel>
    </div>
  );
}
