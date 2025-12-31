'use client';

import type { Game } from '@/lib/types';
import GameLink from './GameLink';
import Spinner from '@/components/ui/Spinner';

interface GamesTableProps {
  games: Game[];
  isLoading?: boolean;
  maxRows?: number;
  showOpening?: boolean;
  showOpponent?: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getResultStyles(result: 'win' | 'loss' | 'draw'): { bg: string; text: string; label: string } {
  switch (result) {
    case 'win':
      return { bg: 'bg-green-500/10', text: 'text-green-400', label: 'W' };
    case 'loss':
      return { bg: 'bg-red-500/10', text: 'text-red-400', label: 'L' };
    case 'draw':
      return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'D' };
  }
}

function getTimeControlLabel(timeClass: string): string {
  const labels: Record<string, string> = {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
  };
  return labels[timeClass] || timeClass;
}

export default function GamesTable({
  games,
  isLoading = false,
  maxRows,
  showOpening = true,
  showOpponent = true,
}: GamesTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
        <span className="ml-2 text-zinc-400">Loading games...</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        No games found
      </div>
    );
  }

  const displayGames = maxRows ? games.slice(0, maxRows) : games;
  const hasMore = maxRows && games.length > maxRows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-800">
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Result</th>
            {showOpponent && <th className="pb-2 pr-4 font-medium">Opponent</th>}
            {showOpening && <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Opening</th>}
            <th className="pb-2 pr-4 font-medium hidden md:table-cell">Time</th>
            <th className="pb-2 font-medium w-10">Link</th>
          </tr>
        </thead>
        <tbody>
          {displayGames.map((game) => {
            const resultStyles = getResultStyles(game.result);
            return (
              <tr
                key={game.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-2 pr-4 text-zinc-300">
                  {formatDate(game.playedAt)}
                </td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-medium ${resultStyles.bg} ${resultStyles.text}`}>
                    {resultStyles.label}
                  </span>
                </td>
                {showOpponent && (
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${game.playerColor === 'white' ? 'bg-white' : 'bg-zinc-700 border border-zinc-500'}`} />
                      <span className="text-zinc-300">{game.opponent.username}</span>
                      <span className="text-zinc-500">({game.opponent.rating})</span>
                    </div>
                  </td>
                )}
                {showOpening && (
                  <td className="py-2 pr-4 hidden sm:table-cell">
                    <span className="text-zinc-400" title={game.opening.name}>
                      {game.opening.eco !== 'Unknown' ? (
                        <>
                          <span className="text-zinc-500">{game.opening.eco}</span>
                          {' '}
                          <span className="hidden lg:inline">{game.opening.name}</span>
                        </>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </span>
                  </td>
                )}
                <td className="py-2 pr-4 hidden md:table-cell">
                  <span className="text-zinc-500">{getTimeControlLabel(game.timeClass)}</span>
                </td>
                <td className="py-2">
                  <GameLink url={game.gameUrl} source={game.source} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {hasMore && (
        <div className="mt-3 text-center text-sm text-zinc-500">
          Showing {displayGames.length} of {games.length} games
        </div>
      )}
    </div>
  );
}
