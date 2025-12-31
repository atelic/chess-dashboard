'use client';

import { useState, useCallback } from 'react';
import type { Game, FetchGamesOptions } from '@/lib/types';
import { fetchChessComGames } from '@/lib/api/chesscom';
import { fetchLichessGames } from '@/lib/api/lichess';
import { mergeAndSortGames, filterGamesByDateRange } from '@/lib/utils';

interface UseGamesState {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  chesscomUsername: string;
  lichessUsername: string;
}

interface UseGamesReturn extends UseGamesState {
  fetchGames: (
    chesscomUsername: string,
    lichessUsername: string,
    options?: FetchGamesOptions
  ) => Promise<void>;
  refetchWithOptions: (options: FetchGamesOptions) => Promise<void>;
  clearGames: () => void;
}

export function useGames(): UseGamesReturn {
  const [state, setState] = useState<UseGamesState>({
    games: [],
    isLoading: false,
    error: null,
    chesscomUsername: '',
    lichessUsername: '',
  });

  const fetchGames = useCallback(
    async (
      chesscomUsername: string,
      lichessUsername: string,
      options: FetchGamesOptions = {}
    ) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        chesscomUsername,
        lichessUsername,
      }));

      try {
        const gamesArrays: Game[][] = [];

        // Fetch from Chess.com if username provided
        if (chesscomUsername) {
          try {
            const chesscomGames = await fetchChessComGames(chesscomUsername, options);
            gamesArrays.push(chesscomGames);
          } catch (error) {
            console.error('Chess.com fetch error:', error);
            throw new Error(`Failed to fetch Chess.com games: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Fetch from Lichess if username provided
        if (lichessUsername) {
          try {
            const lichessGames = await fetchLichessGames(lichessUsername, options);
            gamesArrays.push(lichessGames);
          } catch (error) {
            console.error('Lichess fetch error:', error);
            throw new Error(`Failed to fetch Lichess games: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Merge and sort all games
        let allGames = mergeAndSortGames(gamesArrays);

        // Apply date filters if provided
        if (options.startDate || options.endDate) {
          allGames = filterGamesByDateRange(allGames, options.startDate, options.endDate);
        }

        // Limit to maxGames
        const maxGames = options.maxGames || 100;
        allGames = allGames.slice(0, maxGames);

        setState((prev) => ({
          ...prev,
          games: allGames,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        }));
      }
    },
    []
  );

  const refetchWithOptions = useCallback(
    async (options: FetchGamesOptions) => {
      if (state.chesscomUsername || state.lichessUsername) {
        await fetchGames(state.chesscomUsername, state.lichessUsername, options);
      }
    },
    [fetchGames, state.chesscomUsername, state.lichessUsername]
  );

  const clearGames = useCallback(() => {
    setState({
      games: [],
      isLoading: false,
      error: null,
      chesscomUsername: '',
      lichessUsername: '',
    });
  }, []);

  return {
    ...state,
    fetchGames,
    refetchWithOptions,
    clearGames,
  };
}
