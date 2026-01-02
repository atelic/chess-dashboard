'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import '@/lib/auth/types';

export interface User {
  id: number;
  email: string;
  chesscomUsername: string | null;
  lichessUsername: string | null;
}

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  updateChessUsernames: (chesscomUsername?: string, lichessUsername?: string) => Promise<User | null>;
  deleteUser: () => Promise<boolean>;
}

/**
 * Hook for accessing and managing the current authenticated user.
 * Uses NextAuth session for authentication state.
 */
export function useUser(): UseUserReturn {
  const { data: session, status, update: updateSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  // Transform session user to User type
  const user: User | null = session?.user ? {
    id: parseInt(session.user.id, 10),
    email: session.user.email || '',
    chesscomUsername: session.user.chesscomUsername ?? null,
    lichessUsername: session.user.lichessUsername ?? null,
  } : null;

  const updateChessUsernames = useCallback(
    async (chesscomUsername?: string, lichessUsername?: string): Promise<User | null> => {
      setError(null);

      try {
        const response = await fetch('/api/user', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chesscomUsername: chesscomUsername || null,
            lichessUsername: lichessUsername || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update user');
        }

        // Update the session with new usernames
        await updateSession({
          chesscomUsername: chesscomUsername || null,
          lichessUsername: lichessUsername || null,
        });

        return {
          id: data.user.id,
          email: data.user.email,
          chesscomUsername: data.user.chesscomUsername,
          lichessUsername: data.user.lichessUsername,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update user';
        setError(message);
        return null;
      }
    },
    [updateSession],
  );

  const deleteUser = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      return false;
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    updateChessUsernames,
    deleteUser,
  };
}
