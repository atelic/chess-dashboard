'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { Game } from '@/lib/types';

export type { Game };

interface ApiGameResponse {
  id: string;
  source: 'chesscom' | 'lichess';
  playedAt: string;
  timeClass: 'bullet' | 'blitz' | 'rapid' | 'classical';
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  opening: { eco: string; name: string };
  opponent: { username: string; rating: number };
  playerRating: number;
  termination: string;
  moveCount: number;
  ratingChange?: number;
  rated: boolean;
  gameUrl: string;
  clock?: {
    initialTime: number;
    increment: number;
    timeRemaining?: number;
    avgMoveTime?: number;
  };
  analysis?: {
    accuracy?: number;
    blunders: number;
    mistakes: number;
    inaccuracies: number;
    acpl?: number;
    analyzedAt?: string;
  };
}

function deserializeGame(apiGame: ApiGameResponse): Game {
  return {
    ...apiGame,
    playedAt: new Date(apiGame.playedAt),
    termination: apiGame.termination as Game['termination'],
    analysis: apiGame.analysis ? {
      ...apiGame.analysis,
      analyzedAt: apiGame.analysis.analyzedAt ? new Date(apiGame.analysis.analyzedAt) : undefined,
    } : undefined,
  };
}

interface FetchOptions {
  eco?: string;
  color?: 'white' | 'black';
  result?: 'win' | 'loss' | 'draw';
  opponent?: string;
}

interface UseGamesReturn {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchGames: (options?: FetchOptions) => Promise<void>;
  fetchGamesByEco: (eco: string, color?: 'white' | 'black', result?: 'win' | 'loss' | 'draw') => Promise<Game[]>;
  fetchGamesByOpponent: (opponent: string) => Promise<Game[]>;
  clearGames: () => void;
}

// ============================================
// HOOK
// ============================================

export function useGames(): UseGamesReturn {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { filter } = useAppStore();

  /**
   * Fetch games with optional filters
   */
  const fetchGames = useCallback(async (options?: FetchOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params from store filter and options
      const params = new URLSearchParams();

      if (filter.timeClasses.length > 0) {
        params.set('timeClasses', filter.timeClasses.join(','));
      }
      if (filter.colors.length > 0) {
        params.set('colors', filter.colors.join(','));
      }
      if (filter.results.length > 0) {
        params.set('results', filter.results.join(','));
      }
      if (filter.sources.length > 0) {
        params.set('sources', filter.sources.join(','));
      }
      if (filter.rated !== null) {
        params.set('rated', String(filter.rated));
      }
      if (filter.openings.length > 0) {
        params.set('openings', filter.openings.join(','));
      }

      // Add specific options
      if (options?.eco) {
        params.set('eco', options.eco);
      }
      if (options?.color) {
        params.set('color', options.color);
      }
      if (options?.result) {
        params.set('result', options.result);
      }
      if (options?.opponent) {
        params.set('opponents', options.opponent);
      }

      const url = `/api/games${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch games');
      }

      setGames(data.games.map(deserializeGame));
      setTotalCount(data.count);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch games';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  /**
   * Fetch games by ECO code (for inline expansion)
   */
  const fetchGamesByEco = useCallback(
    async (eco: string, color?: 'white' | 'black', result?: 'win' | 'loss' | 'draw'): Promise<Game[]> => {
      try {
        const params = new URLSearchParams();
        params.set('eco', eco);
        if (color) params.set('color', color);
        if (result) params.set('result', result);

        const response = await fetch(`/api/games?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch games');
        }

        return data.games.map(deserializeGame);
      } catch (err) {
        console.error('Failed to fetch games by ECO:', err);
        return [];
      }
    },
    [],
  );

  /**
   * Fetch games by opponent (for inline expansion)
   */
  const fetchGamesByOpponent = useCallback(async (opponent: string): Promise<Game[]> => {
    try {
      const params = new URLSearchParams();
      params.set('opponents', opponent);

      const response = await fetch(`/api/games?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch games');
      }

      return data.games.map(deserializeGame);
    } catch (err) {
      console.error('Failed to fetch games by opponent:', err);
      return [];
    }
  }, []);

  /**
   * Clear games from state
   */
  const clearGames = useCallback(() => {
    setGames([]);
    setTotalCount(0);
    setError(null);
  }, []);

  return {
    games,
    isLoading,
    error,
    totalCount,
    fetchGames,
    fetchGamesByEco,
    fetchGamesByOpponent,
    clearGames,
  };
}
