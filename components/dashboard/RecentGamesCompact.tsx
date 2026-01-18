'use client';

import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { WinIcon, LossIcon, DrawIcon } from '@/components/icons/ChessPieces';
import type { Game } from '@/lib/types';

interface RecentGamesCompactProps {
  games: Game[];
  maxGames?: number;
  className?: string;
}

function ResultIcon({ result }: { result: Game['result'] }) {
  switch (result) {
    case 'win':
      return <WinIcon />;
    case 'loss':
      return <LossIcon />;
    case 'draw':
      return <DrawIcon />;
  }
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return relativeTimeFormatter.format(-diffMins, 'minute');
  if (diffHours < 24) return relativeTimeFormatter.format(-diffHours, 'hour');
  if (diffDays < 7) return relativeTimeFormatter.format(-diffDays, 'day');
  return dateTimeFormatter.format(date);
}

function GameRow({ game }: { game: Game }) {
  return (
    <a
      href={game.gameUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <ResultIcon result={game.result} />
        <Badge variant={game.playerColor === 'white' ? 'white' : 'black'} className="w-6 h-6 p-0 flex items-center justify-center text-[10px]">
          {game.playerColor === 'white' ? 'W' : 'B'}
        </Badge>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {game.opponent.username}
          </span>
          <span className="text-muted-foreground text-sm">
            ({game.opponent.rating})
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {game.opening.name}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className={cn(
          'text-sm font-medium',
          game.ratingChange && game.ratingChange > 0 && 'text-success',
          game.ratingChange && game.ratingChange < 0 && 'text-destructive',
          (!game.ratingChange || game.ratingChange === 0) && 'text-muted-foreground'
        )}>
          {game.ratingChange ? (game.ratingChange > 0 ? '+' : '') + game.ratingChange : '—'}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatTimeAgo(game.playedAt)}
        </div>
      </div>

      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </a>
  );
}

export function RecentGamesCompact({ games, maxGames = 5, className }: RecentGamesCompactProps) {
  const recentGames = React.useMemo(() =>
    [...games]
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
      .slice(0, maxGames),
    [games, maxGames]
  );

  if (recentGames.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Games</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {recentGames.map((game) => (
            <GameRow key={game.id} game={game} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default RecentGamesCompact;
