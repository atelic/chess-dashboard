'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

interface User {
  id: number;
  chesscomUsername: string | null;
  lichessUsername: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
}

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  fetchUser: () => Promise<User | null>;
  createOrUpdateUser: (chesscomUsername?: string, lichessUsername?: string) => Promise<User | null>;
  deleteUser: () => Promise<boolean>;
}

export function useUser(): UseUserReturn {
  const { user, setUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user');
      }

      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const createOrUpdateUser = useCallback(
    async (chesscomUsername?: string, lichessUsername?: string): Promise<User | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chesscomUsername: chesscomUsername || null,
            lichessUsername: lichessUsername || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save user');
        }

        setUser(data.user);
        return data.user;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save user';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const deleteUser = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setUser(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  // Fetch user on mount if not in store
  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  return {
    user,
    isLoading,
    error,
    fetchUser,
    createOrUpdateUser,
    deleteUser,
  };
}
