'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Game, AnalysisData } from '@/lib/types';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import GamesTable from '@/components/games/GamesTable';
import { useAppStore } from '@/stores/useAppStore';
import { fetchChessComMonthlyArchive, extractChessComAnalysis } from '@/lib/infrastructure/api-clients/ChessComClient';

interface BulkFetchProgress {
  current: number;
  total: number;
  found: number;
  source: 'lichess' | 'chesscom' | null;
}

interface GamesTabProps {
  games: Game[];
  onAnalyze?: (gameId: string) => Promise<void>;
}

type TimeClass = 'all' | 'bullet' | 'blitz' | 'rapid' | 'classical';
type Result = 'all' | 'win' | 'loss' | 'draw';
type Source = 'all' | 'chesscom' | 'lichess';

export default function GamesTab({ games, onAnalyze }: GamesTabProps) {
  const [search, setSearch] = useState('');
  const [timeClass, setTimeClass] = useState<TimeClass>('all');
  const [result, setResult] = useState<Result>('all');
  const [source, setSource] = useState<Source>('all');
  const [page, setPage] = useState(0);
  const [bulkFetchProgress, setBulkFetchProgress] = useState<BulkFetchProgress | null>(null);
  const [bulkFetchError, setBulkFetchError] = useState<string | null>(null);
  
  const user = useAppStore(state => state.user);
  
  const PAGE_SIZE = 25;

  /**
   * Fetch Lichess analysis for a game via our API
   * The analysis is saved to the DB by the API, and displayed immediately via local state
   */
  const handleFetchLichessAnalysis = useCallback(async (
    gameId: string, 
    playerColor: 'white' | 'black'
  ): Promise<AnalysisData | null> => {
    const response = await fetch(
      `/api/games/analysis?gameId=${gameId}&playerColor=${playerColor}&source=lichess`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch analysis');
    }
    
    const data = await response.json();
    
    // Analysis is saved to DB by the API endpoint
    // The GameAnalysisPanel will display it immediately via local state
    // Next time games are loaded, it will come from the DB
    
    return data.analysis;
  }, []);

  /**
   * Fetch Chess.com analysis for a game via our API
   * The analysis is saved to the DB by the API, and displayed immediately via local state
   */
  const handleFetchChessComAnalysis = useCallback(async (
    game: Game
  ): Promise<AnalysisData | null> => {
    const chesscomUsername = user?.chesscomUsername;
    if (!chesscomUsername) {
      throw new Error('Chess.com username not configured');
    }

    const params = new URLSearchParams({
      gameId: game.id,
      playerColor: game.playerColor,
      source: 'chesscom',
      username: chesscomUsername,
      gameUrl: game.gameUrl,
      gameDate: game.playedAt.toISOString(),
    });

    const response = await fetch(`/api/games/analysis?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch analysis');
    }
    
    const data = await response.json();
    
    // Analysis is saved to DB by the API endpoint
    // The GameAnalysisPanel will display it immediately via local state
    // Next time games are loaded, it will come from the DB
    
    return data.analysis;
  }, [user]);

  /**
   * Fetch analysis for all games that don't have analysis yet
   * Processes Lichess and Chess.com games sequentially to avoid rate limiting
   */
  const handleFetchAllAnalysis = useCallback(async () => {
    setBulkFetchError(null);
    
    // Find games without analysis
    const gamesWithoutAnalysis = games.filter(g => g.analysis?.accuracy === undefined);
    
    if (gamesWithoutAnalysis.length === 0) {
      setBulkFetchError('All games already have analysis data.');
      return;
    }

    const lichessGames = gamesWithoutAnalysis.filter(g => g.source === 'lichess');
    const chesscomGames = gamesWithoutAnalysis.filter(g => g.source === 'chesscom');
    
    let totalFound = 0;
    const totalGames = gamesWithoutAnalysis.length;

    try {
      // Process Lichess games first
      if (lichessGames.length > 0) {
        for (let i = 0; i < lichessGames.length; i++) {
          const game = lichessGames[i];
          setBulkFetchProgress({
            current: i + 1,
            total: totalGames,
            found: totalFound,
            source: 'lichess',
          });

          try {
            const result = await handleFetchLichessAnalysis(game.id, game.playerColor);
            if (result) {
              totalFound++;
              setBulkFetchProgress(prev => prev ? { ...prev, found: totalFound } : null);
            }
          } catch (err) {
            console.error(`Failed to fetch Lichess analysis for ${game.id}:`, err);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Process Chess.com games - fetch each monthly archive once
      if (chesscomGames.length > 0 && user?.chesscomUsername) {
        // Group Chess.com games by month
        const gamesByMonth = new Map<string, Game[]>();
        for (const game of chesscomGames) {
          const monthKey = `${game.playedAt.getFullYear()}-${game.playedAt.getMonth() + 1}`;
          if (!gamesByMonth.has(monthKey)) {
            gamesByMonth.set(monthKey, []);
          }
          gamesByMonth.get(monthKey)!.push(game);
        }

        let processedChesscom = 0;
        for (const [monthKey, monthGames] of gamesByMonth) {
          const [year, month] = monthKey.split('-').map(Number);
          
          // Fetch the monthly archive once
          setBulkFetchProgress({
            current: lichessGames.length + processedChesscom + 1,
            total: totalGames,
            found: totalFound,
            source: 'chesscom',
          });

          const archiveMap = await fetchChessComMonthlyArchive(user.chesscomUsername, year, month);
          
          // Extract analysis for each game in this month
          for (const game of monthGames) {
            processedChesscom++;
            setBulkFetchProgress({
              current: lichessGames.length + processedChesscom,
              total: totalGames,
              found: totalFound,
              source: 'chesscom',
            });

            if (archiveMap) {
              const archiveGame = archiveMap.get(game.gameUrl);
              if (archiveGame) {
                const analysis = extractChessComAnalysis(archiveGame, game.playerColor);
                if (analysis?.accuracy !== undefined) {
                  // Save to DB via API
                  try {
                    const params = new URLSearchParams({
                      gameId: game.id,
                      playerColor: game.playerColor,
                      source: 'chesscom',
                      username: user.chesscomUsername,
                      gameUrl: game.gameUrl,
                      gameDate: game.playedAt.toISOString(),
                    });
                    await fetch(`/api/games/analysis?${params}`);
                    totalFound++;
                    setBulkFetchProgress(prev => prev ? { ...prev, found: totalFound } : null);
                  } catch (err) {
                    console.error(`Failed to save Chess.com analysis for ${game.id}:`, err);
                  }
                }
              }
            }
          }

          // Delay between months to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Done
      setBulkFetchProgress(null);
      
      if (totalFound === 0) {
        setBulkFetchError(`Checked ${totalGames} games but no new analysis was available. Games may need to be analyzed on Lichess/Chess.com first.`);
      }
    } catch (err) {
      setBulkFetchProgress(null);
      setBulkFetchError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    }
  }, [games, user, handleFetchLichessAnalysis]);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Search by opponent name or opening
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesOpponent = game.opponent.username.toLowerCase().includes(searchLower);
        const matchesOpening = game.opening.name.toLowerCase().includes(searchLower) || 
                                game.opening.eco.toLowerCase().includes(searchLower);
        if (!matchesOpponent && !matchesOpening) return false;
      }
      
      // Filter by time class
      if (timeClass !== 'all' && game.timeClass !== timeClass) return false;
      
      // Filter by result
      if (result !== 'all' && game.result !== result) return false;
      
      // Filter by source
      if (source !== 'all' && game.source !== source) return false;
      
      return true;
    });
  }, [games, search, timeClass, result, source]);

  // Paginate
  const paginatedGames = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredGames.slice(start, start + PAGE_SIZE);
  }, [filteredGames, page]);

  const totalPages = Math.ceil(filteredGames.length / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = useCallback(() => {
    setPage(0);
  }, []);

  // Stats summary
  const stats = useMemo(() => {
    const analyzed = filteredGames.filter(g => g.analysis?.accuracy !== undefined).length;
    const avgAccuracy = filteredGames
      .filter(g => g.analysis?.accuracy !== undefined)
      .reduce((sum, g) => sum + (g.analysis?.accuracy || 0), 0) / (analyzed || 1);
    
    return { total: filteredGames.length, analyzed, avgAccuracy };
  }, [filteredGames]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-zinc-400 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Opponent or opening..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            />
          </div>
          
          {/* Time Class */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Time Control</label>
            <select
              value={timeClass}
              onChange={(e) => { setTimeClass(e.target.value as TimeClass); handleFilterChange(); }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="bullet">Bullet</option>
              <option value="blitz">Blitz</option>
              <option value="rapid">Rapid</option>
              <option value="classical">Classical</option>
            </select>
          </div>
          
          {/* Result */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Result</label>
            <select
              value={result}
              onChange={(e) => { setResult(e.target.value as Result); handleFilterChange(); }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
              <option value="draw">Draws</option>
            </select>
          </div>
          
          {/* Source */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value as Source); handleFilterChange(); }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="chesscom">Chess.com</option>
              <option value="lichess">Lichess</option>
            </select>
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-zinc-400">
            <span className="text-zinc-100 font-medium">{stats.total}</span> games
          </span>
          <span className="text-zinc-400">
            <span className="text-zinc-100 font-medium">{stats.analyzed}</span> analyzed
          </span>
          {stats.analyzed > 0 && (
            <span className="text-zinc-400">
              <span className="text-zinc-100 font-medium">{stats.avgAccuracy.toFixed(1)}%</span> avg accuracy
            </span>
          )}
          
          {/* Fetch All Analysis Button */}
          <div className="ml-auto flex items-center gap-3">
            {bulkFetchProgress ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <Spinner size="sm" />
                <span>
                  Checking {bulkFetchProgress.source === 'lichess' ? 'Lichess' : 'Chess.com'}... 
                  {bulkFetchProgress.current}/{bulkFetchProgress.total}
                  {bulkFetchProgress.found > 0 && (
                    <span className="text-green-400 ml-1">({bulkFetchProgress.found} found)</span>
                  )}
                </span>
              </div>
            ) : (
              <Button
                onClick={handleFetchAllAnalysis}
                variant="secondary"
                disabled={stats.total === stats.analyzed}
              >
                Fetch all analysis
              </Button>
            )}
          </div>
        </div>
        
        {/* Bulk fetch error/info message */}
        {bulkFetchError && (
          <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-400">
            {bulkFetchError}
          </div>
        )}
      </Card>

      {/* Games Table */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Recent Games</h3>
          <p className="text-sm text-zinc-500 mt-1">Click a row to expand and see analysis details</p>
        </div>
        
        <GamesTable
          games={paginatedGames}
          expandable
          showAnalysis
          onAnalyze={onAnalyze}
          onFetchLichessAnalysis={handleFetchLichessAnalysis}
          onFetchChessComAnalysis={handleFetchChessComAnalysis}
        />
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
