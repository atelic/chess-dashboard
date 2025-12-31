'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';

interface SyncResult {
  success: boolean;
  newGamesCount: number;
  totalGamesCount: number;
  sources: Array<{
    source: string;
    newGames: number;
    error?: string;
  }>;
}

interface UseSyncReturn {
  isSyncing: boolean;
  lastSynced: Date | null;
  lastError: string | null;
  sync: (fullSync?: boolean) => Promise<SyncResult | null>;
  fullResync: () => Promise<SyncResult | null>;
  clearError: () => void;
}

export function useSync(): UseSyncReturn {
  const { syncStatus, setSyncing, setSyncComplete, setSyncError, clearSyncError } = useAppStore();

  const sync = useCallback(
    async (fullSync: boolean = false): Promise<SyncResult | null> => {
      setSyncing(true);

      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullSync }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Sync failed');
        }

        setSyncComplete(new Date());
        return data as SyncResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        setSyncError(message);
        return null;
      }
    },
    [setSyncing, setSyncComplete, setSyncError],
  );

  const fullResync = useCallback(async (): Promise<SyncResult | null> => {
    setSyncing(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Full resync failed');
      }

      setSyncComplete(new Date());
      return data as SyncResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Full resync failed';
      setSyncError(message);
      return null;
    }
  }, [setSyncing, setSyncComplete, setSyncError]);

  return {
    isSyncing: syncStatus.isSyncing,
    lastSynced: syncStatus.lastSynced,
    lastError: syncStatus.lastError,
    sync,
    fullResync,
    clearError: clearSyncError,
  };
}
