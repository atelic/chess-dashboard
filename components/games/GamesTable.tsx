'use client';

import { useState, Fragment, useCallback } from 'react';
import type { Game, AnalysisData } from '@/lib/types';
import GameLink from './GameLink';
import GameAnalysisPanel from './GameAnalysisPanel';
import TerminationIcon from './TerminationIcon';
import Spinner from '@/components/ui/Spinner';

interface GamesTableProps {
  games: Game[];
  isLoading?: boolean;
  maxRows?: number;
  showOpening?: boolean;
  showOpponent?: boolean;
  showAnalysis?: boolean;
  expandable?: boolean;
  onAnalyze?: (gameId: string) => Promise<void>;
  onFetchLichessAnalysis?: (gameId: string, playerColor: 'white' | 'black') => Promise<AnalysisData | null>;
  onFetchChessComAnalysis?: (game: Game) => Promise<AnalysisData | null>;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

function getResultStyles(result: 'win' | 'loss' | 'draw'): { bg: string; text: string; label: string } {
  switch (result) {
    case 'win':
      return { bg: 'bg-green-500/10', text: 'text-green-400', label: 'W' };
    case 'loss':
      return { bg: 'bg-red-500/10', text: 'text-red-400', label: 'L' };
    case 'draw':
      return { bg: 'bg-muted/30', text: 'text-muted-foreground', label: 'D' };
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
  showAnalysis = false,
  expandable = false,
  onAnalyze,
  onFetchLichessAnalysis,
  onFetchChessComAnalysis,
}: GamesTableProps) {
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  // Track analysis updates locally so Accuracy column updates immediately
  const [updatedAnalysis, setUpdatedAnalysis] = useState<Map<string, AnalysisData>>(new Map());

  const toggleExpand = (gameId: string) => {
    setExpandedGameId(prev => prev === gameId ? null : gameId);
  };

  // Wrap Lichess fetch handler to update local state
  const handleFetchLichessAnalysis = useCallback(async (
    gameId: string,
    playerColor: 'white' | 'black'
  ): Promise<AnalysisData | null> => {
    if (!onFetchLichessAnalysis) return null;
    const result = await onFetchLichessAnalysis(gameId, playerColor);
    if (result) {
      setUpdatedAnalysis(prev => new Map(prev).set(gameId, result));
    }
    return result;
  }, [onFetchLichessAnalysis]);

  // Wrap Chess.com fetch handler to update local state
  const handleFetchChessComAnalysis = useCallback(async (
    game: Game
  ): Promise<AnalysisData | null> => {
    if (!onFetchChessComAnalysis) return null;
    const result = await onFetchChessComAnalysis(game);
    if (result) {
      setUpdatedAnalysis(prev => new Map(prev).set(game.id, result));
    }
    return result;
  }, [onFetchChessComAnalysis]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
        <span className="ml-2 text-muted-foreground">Loading games…</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No games found
      </div>
    );
  }

  const displayGames = maxRows ? games.slice(0, maxRows) : games;
  const hasMore = maxRows && games.length > maxRows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Chess games table showing date, result, opponent{showOpponent && ', opening'}{showOpening && ', and analysis'}
        </caption>
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            {expandable && <th className="pb-2 pr-2 font-medium w-8"></th>}
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Result</th>
            {showOpponent && <th className="pb-2 pr-4 font-medium">Opponent</th>}
            {showOpening && <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Opening</th>}
            <th className="pb-2 pr-4 font-medium hidden md:table-cell">Time</th>
            {showAnalysis && <th className="pb-2 pr-4 font-medium hidden lg:table-cell">Accuracy</th>}
            <th className="pb-2 font-medium w-10">Link</th>
          </tr>
        </thead>
        <tbody>
          {displayGames.map((game) => {
            const resultStyles = getResultStyles(game.result);
            const isExpanded = expandedGameId === game.id;
            // Use locally updated analysis if available, otherwise use game's analysis
            const localAnalysis = updatedAnalysis.get(game.id);
            const accuracy = localAnalysis?.accuracy ?? game.analysis?.accuracy;
            const colSpan = 4 + (showOpponent ? 1 : 0) + (showOpening ? 1 : 0) + (showAnalysis ? 1 : 0) + (expandable ? 1 : 0);
            
            return (
              <Fragment key={game.id}>
                <tr
                  className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${expandable ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-secondary/30' : ''}`}
                  onClick={expandable ? () => toggleExpand(game.id) : undefined}
                  onKeyDown={expandable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(game.id);
                    }
                  } : undefined}
                  tabIndex={expandable ? 0 : undefined}
                  role={expandable ? 'button' : undefined}
                  aria-expanded={expandable ? isExpanded : undefined}
                  aria-label={expandable ? `${isExpanded ? 'Collapse' : 'Expand'} game details for ${formatDateTime(game.playedAt)} vs ${game.opponent.username}` : undefined}
                >
                  {expandable && (
                    <td className="py-2 pr-2 text-muted-foreground">
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  )}
                  <td className="py-2 pr-4 text-muted-foreground" title={formatDate(game.playedAt)}>
                    {formatDateTime(game.playedAt)}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-medium ${resultStyles.bg} ${resultStyles.text}`}>
                        {resultStyles.label}
                      </span>
                      <TerminationIcon termination={game.termination} result={game.result} />
                    </div>
                  </td>
                  {showOpponent && (
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${game.playerColor === 'white' ? 'bg-white' : 'bg-muted border border-border'}`} aria-hidden="true" />
                        <span className="text-muted-foreground">{game.opponent.username}</span>
                        <span className="text-muted-foreground">({game.opponent.rating})</span>
                      </div>
                    </td>
                  )}
                  {showOpening && (
                    <td className="py-2 pr-4 hidden sm:table-cell">
                      <span className="text-muted-foreground" title={game.opening.name}>
                        {game.opening.eco !== 'Unknown' ? (
                          <>
                            <span className="text-muted-foreground">{game.opening.eco}</span>
                            {' '}
                            <span className="hidden lg:inline">{game.opening.name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </span>
                    </td>
                  )}
                  <td className="py-2 pr-4 hidden md:table-cell">
                    <span className="text-muted-foreground">{getTimeControlLabel(game.timeClass)}</span>
                  </td>
                    {showAnalysis && (
                    <td className="py-2 pr-4 hidden lg:table-cell">
                      {accuracy !== undefined ? (
                        <span className={`font-medium ${
                          accuracy >= 90 ? 'text-green-600 dark:text-green-400' :
                          accuracy >= 80 ? 'text-lime-600 dark:text-lime-400' :
                          accuracy >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                          accuracy >= 60 ? 'text-orange-600 dark:text-orange-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {accuracy}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  )}
                  <td className="py-2" onClick={(e) => e.stopPropagation()}>
                    <GameLink url={game.gameUrl} source={game.source} />
                  </td>
                </tr>
                {expandable && isExpanded && (
                  <tr className="bg-card/50">
                    <td colSpan={colSpan} className="p-4">
                      <GameAnalysisPanel
                        game={game}
                        onAnalyze={onAnalyze}
                        onFetchLichessAnalysis={handleFetchLichessAnalysis}
                        onFetchChessComAnalysis={handleFetchChessComAnalysis}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      
      {hasMore && (
        <div className="mt-3 text-center text-sm text-muted-foreground">
          Showing {displayGames.length} of {games.length} games
        </div>
      )}
    </div>
  );
}
