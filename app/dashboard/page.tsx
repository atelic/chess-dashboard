'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useGames, Game } from '@/hooks/useGames';
import { useAppStore } from '@/stores/useAppStore';
import DashboardHeader from '@/components/DashboardHeader';
import Dashboard from '@/components/Dashboard';
import AdvancedFilters from '@/components/AdvancedFilters';
import Spinner from '@/components/ui/Spinner';
import type { Game as LibGame, FilterState } from '@/lib/types';
import { getDefaultFilters, filterGames } from '@/lib/utils';

/**
 * Convert API game (playedAt: string) to lib Game (playedAt: Date)
 */
function convertGames(apiGames: Game[]): LibGame[] {
  return apiGames.map((game) => ({
    ...game,
    playedAt: new Date(game.playedAt),
    analysis: game.analysis ? {
      ...game.analysis,
      analyzedAt: game.analysis.analyzedAt ? new Date(game.analysis.analyzedAt) : undefined,
    } : undefined,
  }));
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { games: apiGames, isLoading: gamesLoading, error, fetchGames, totalCount } = useGames();
  const { setFilter } = useAppStore();

  // Local filter state for the AdvancedFilters UI component
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());

  // Convert API games to lib games with Date objects
  const games = useMemo(() => convertGames(apiGames), [apiGames]);

  // Apply client-side filters
  const filteredGames = useMemo(() => {
    return filterGames(games, filters);
  }, [games, filters]);

  // Redirect to setup if no user
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  // Fetch games on mount when user exists
  useEffect(() => {
    if (user) {
      fetchGames();
    }
  }, [user, fetchGames]);

  // Sync store filter with local filter state
  useEffect(() => {
    setFilter({
      timeClasses: filters.timeClasses,
      colors: filters.colors,
      results: filters.results,
      sources: filters.sources,
      rated: null, // Will be added when rated filter is implemented
      openings: filters.openings,
    });
  }, [filters, setFilter]);

  // Show loading while checking for user
  if (userLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // User doesn't exist - will redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-4 text-zinc-400">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleRefetch = async () => {
    // This is a no-op for now since we use sync instead
    // The sync button in DashboardHeader handles refreshing
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header with user info and sync controls */}
      <DashboardHeader onGamesUpdated={fetchGames} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Advanced Filters */}
        {games.length > 0 && (
          <div className="mb-6">
            <AdvancedFilters
              games={games}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onRefetch={handleRefetch}
              isLoading={gamesLoading}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Dashboard */}
        <Dashboard games={filteredGames} isLoading={gamesLoading} />

        {/* Source Attribution */}
        {games.length > 0 && (
          <div className="mt-8 text-center text-sm text-zinc-600">
            <p>
              Showing {filteredGames.length} of {totalCount || games.length} games
              {user.chesscomUsername && user.lichessUsername
                ? ` from Chess.com (${user.chesscomUsername}) and Lichess (${user.lichessUsername})`
                : user.chesscomUsername
                ? ` from Chess.com (${user.chesscomUsername})`
                : user.lichessUsername
                ? ` from Lichess (${user.lichessUsername})`
                : ''}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-zinc-600">
            Chess Dashboard - Analyze your games from Chess.com and Lichess
          </p>
        </div>
      </footer>
    </div>
  );
}
