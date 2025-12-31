'use client';

import { useState } from 'react';
import UsernameForm from '@/components/UsernameForm';
import DateRangeFilter from '@/components/DateRangeFilter';
import Dashboard from '@/components/Dashboard';
import { useGames } from '@/hooks/useGames';
import { useToast } from '@/components/ui/Toast';

export default function Home() {
  const { games, isLoading, error, fetchGames, refetchWithOptions, chesscomUsername, lichessUsername } = useGames();
  const { showToast } = useToast();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (chesscom: string, lichess: string) => {
    setHasSearched(true);
    try {
      await fetchGames(chesscom, lichess, { maxGames: 100 });
      
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Games loaded successfully!', 'success');
      }
    } catch {
      showToast('Failed to fetch games. Please try again.', 'error');
    }
  };

  const handleFilterChange = async (startDate: Date | undefined, endDate: Date | undefined, maxGames: number) => {
    if (!chesscomUsername && !lichessUsername) return;
    
    try {
      await refetchWithOptions({ startDate, endDate, maxGames });
      showToast('Games filtered successfully!', 'success');
    } catch {
      showToast('Failed to filter games.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Chess Dashboard</h1>
              <p className="text-sm text-zinc-500">Analyze your games from Chess.com and Lichess</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Username Form */}
        <div className="mb-8">
          <UsernameForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Show filter and dashboard only after search */}
        {hasSearched && (
          <>
            {/* Date Range Filter */}
            {(chesscomUsername || lichessUsername) && games.length > 0 && (
              <div className="mb-6">
                <DateRangeFilter onFilterChange={handleFilterChange} isLoading={isLoading} />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Dashboard */}
            <Dashboard games={games} isLoading={isLoading} />

            {/* Source Attribution */}
            {games.length > 0 && (
              <div className="mt-8 text-center text-sm text-zinc-600">
                <p>
                  Showing {games.length} games from{' '}
                  {chesscomUsername && lichessUsername
                    ? `Chess.com (${chesscomUsername}) and Lichess (${lichessUsername})`
                    : chesscomUsername
                    ? `Chess.com (${chesscomUsername})`
                    : `Lichess (${lichessUsername})`}
                </p>
              </div>
            )}
          </>
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
