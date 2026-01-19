'use client';

import { useMemo, useState } from 'react';
import type { Game } from '@/lib/types';
import {
  calculateOpponentStats,
  findNemesis,
  findFavoriteOpponent,
  calculateRatingBrackets,
} from '@/lib/utils';
import {
  Users,
  Skull,
  Heart,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import CommandPanel, { ProgressBar } from '@/components/layout/CommandPanel';
import { cn } from '@/lib/utils';

interface OpponentsViewProps {
  games: Game[];
}

export default function OpponentsView({ games }: OpponentsViewProps) {
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);

  // Calculate opponent stats
  const opponentStats = useMemo(() => {
    const stats = calculateOpponentStats(games);
    return stats.sort((a, b) => b.games - a.games);
  }, [games]);

  const nemesis = useMemo(() => findNemesis(games), [games]);
  const favorite = useMemo(() => findFavoriteOpponent(games), [games]);
  const ratingBrackets = useMemo(() => calculateRatingBrackets(games), [games]);

  // Get games vs specific opponent
  const getOpponentGames = (username: string) => {
    return games.filter(
      (g) => g.opponent.username.toLowerCase() === username.toLowerCase()
    );
  };

  // Calculate avg opponent rating
  const avgOpponentRating = useMemo(() => {
    if (games.length === 0) return 0;
    const sum = games.reduce((acc, g) => acc + g.opponent.rating, 0);
    return Math.round(sum / games.length);
  }, [games]);

  // Unique opponent count
  const uniqueOpponents = useMemo(() => {
    const unique = new Set(games.map((g) => g.opponent.username.toLowerCase()));
    return unique.size;
  }, [games]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Opponent Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Understand your performance against different opponents
        </p>
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nemesis */}
        <div className="metric-card bg-red-500/5 border-red-500/20">
          <div className="flex items-start justify-between mb-3">
            <span className="metric-label text-red-400">Nemesis</span>
            <Skull className="w-5 h-5 text-red-400" />
          </div>
          {nemesis ? (
            <>
              <div className="text-xl font-bold text-foreground">{nemesis.username}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {nemesis.wins}W - {nemesis.losses}L - {nemesis.draws}D
              </div>
              <div className="mt-1 text-sm font-medium text-red-400">
                {nemesis.winRate.toFixed(0)}% win rate
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">Not enough data</div>
          )}
        </div>

        {/* Favorite Opponent */}
        <div className="metric-card bg-green-500/5 border-green-500/20">
          <div className="flex items-start justify-between mb-3">
            <span className="metric-label text-green-400">Favorite</span>
            <Heart className="w-5 h-5 text-green-400" />
          </div>
          {favorite ? (
            <>
              <div className="text-xl font-bold text-foreground">{favorite.username}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {favorite.wins}W - {favorite.losses}L - {favorite.draws}D
              </div>
              <div className="mt-1 text-sm font-medium text-green-400">
                {favorite.winRate.toFixed(0)}% win rate
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">Not enough data</div>
          )}
        </div>

        {/* Avg Opponent Rating */}
        <div className="metric-card">
          <div className="flex items-start justify-between mb-3">
            <span className="metric-label">Avg Opponent</span>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="metric-value">{avgOpponentRating}</div>
          <div className="mt-2 text-sm text-muted-foreground">rating</div>
        </div>

        {/* Unique Opponents */}
        <div className="metric-card">
          <div className="flex items-start justify-between mb-3">
            <span className="metric-label">Unique Players</span>
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="metric-value">{uniqueOpponents.toLocaleString()}</div>
          <div className="mt-2 text-sm text-muted-foreground">opponents faced</div>
        </div>
      </div>

      {/* Performance by Rating Bracket */}
      <CommandPanel
        title="Performance by Rating"
        description="How you perform against different rating ranges"
        icon={<TrendingUp className="w-5 h-5" />}
      >
        {ratingBrackets.length > 0 ? (
          <div className="space-y-4">
            {ratingBrackets.map((bracket) => {
              const winRateColor =
                bracket.winRate >= 60
                  ? 'success'
                  : bracket.winRate >= 45
                  ? 'warning'
                  : 'danger';
              return (
                <div key={bracket.bracket} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium">{bracket.bracket}</div>
                  <div className="flex-1">
                    <ProgressBar
                      value={bracket.winRate}
                      color={winRateColor}
                      size="md"
                      showValue
                    />
                  </div>
                  <div className="w-24 text-right text-sm text-muted-foreground">
                    {bracket.games} games
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not enough games to analyze</p>
        )}
      </CommandPanel>

      {/* Frequent Opponents Table */}
      <CommandPanel
        title="Frequent Opponents"
        description="Players you've faced multiple times"
        icon={<Users className="w-5 h-5" />}
        badge={{ text: `${opponentStats.filter((o) => o.games >= 2).length}`, variant: 'info' }}
      >
        <div className="max-h-[500px] overflow-y-auto -mx-5 -mb-5">
          {opponentStats.filter((o) => o.games >= 2).length > 0 ? (
            <div>
              {opponentStats
                .filter((o) => o.games >= 2)
                .map((opponent) => {
                  const isExpanded = expandedOpponent === opponent.username;
                  const opponentGames = getOpponentGames(opponent.username);
                  const winRateColor =
                    opponent.winRate >= 60
                      ? 'text-green-400'
                      : opponent.winRate >= 45
                      ? 'text-yellow-400'
                      : 'text-red-400';

                  return (
                    <div
                      key={opponent.username}
                      className="border-b border-border last:border-0"
                    >
                      <button
                        onClick={() =>
                          setExpandedOpponent(isExpanded ? null : opponent.username)
                        }
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
                          <div className="text-sm font-medium text-foreground">
                            {opponent.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avg rating: {opponent.avgRating}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm">{opponent.games} games</div>
                            <div className="text-xs text-muted-foreground">
                              {opponent.wins}W - {opponent.losses}L - {opponent.draws}D
                            </div>
                          </div>

                          <div className={cn('text-lg font-bold', winRateColor)}>
                            {opponent.winRate.toFixed(0)}%
                          </div>
                        </div>
                      </button>

                      {/* Expanded Games */}
                      {isExpanded && (
                        <div className="bg-card/50 border-t border-border p-4">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                            Games vs {opponent.username}
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {opponentGames.map((game, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-2 rounded bg-secondary/30"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={cn(
                                      'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                                      game.result === 'win' &&
                                        'bg-green-500/20 text-green-400',
                                      game.result === 'loss' &&
                                        'bg-red-500/20 text-red-400',
                                      game.result === 'draw' &&
                                        'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {game.result === 'win'
                                      ? 'W'
                                      : game.result === 'loss'
                                      ? 'L'
                                      : 'D'}
                                  </span>
                                  <div>
                                    {game.opening?.name && (
                                      <div className="text-sm">
                                        {game.opening.name}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                      {game.playedAt.toLocaleDateString()} ·{' '}
                                      {game.timeClass}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    {game.playerColor === 'white' ? '⬜' : '⬛'}
                                  </span>
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
                })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm p-5">
              No repeat opponents found. Play more games!
            </p>
          )}
        </div>
      </CommandPanel>
    </div>
  );
}
