'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameResult, PlayerColor } from '@/lib/shared/types';

// ============================================
// TYPES
// ============================================

interface User {
  id: number;
  chesscomUsername: string | null;
  lichessUsername: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSynced: Date | null;
  lastError: string | null;
}

interface FilterState {
  timeClasses: string[];
  colors: string[];
  results: string[];
  sources: string[];
  rated: boolean | null;
  openings: string[];
}

interface ExpandedSection {
  type: 'opening' | 'opponent' | null;
  id: string | null;
  color?: PlayerColor;
  result?: GameResult;
}

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Sync status
  syncStatus: SyncStatus;
  setSyncing: (isSyncing: boolean) => void;
  setSyncComplete: (lastSynced: Date) => void;
  setSyncError: (error: string) => void;
  clearSyncError: () => void;

  // Filters (client-side filtering)
  filter: FilterState;
  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;

  // Expanded section for inline game display
  expandedSection: ExpandedSection;
  setExpandedSection: (
    type: 'opening' | 'opponent' | null,
    id: string | null,
    options?: { color?: PlayerColor; result?: GameResult },
  ) => void;
  clearExpandedSection: () => void;
}

// ============================================
// DEFAULT VALUES
// ============================================

const defaultFilter: FilterState = {
  timeClasses: [],
  colors: [],
  results: [],
  sources: [],
  rated: null,
  openings: [],
};

const defaultSyncStatus: SyncStatus = {
  isSyncing: false,
  lastSynced: null,
  lastError: null,
};

const defaultExpandedSection: ExpandedSection = {
  type: null,
  id: null,
};

// ============================================
// STORE
// ============================================

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),

      // Sync status
      syncStatus: defaultSyncStatus,
      setSyncing: (isSyncing) =>
        set((state) => ({
          syncStatus: { ...state.syncStatus, isSyncing, lastError: null },
        })),
      setSyncComplete: (lastSynced) =>
        set((state) => ({
          syncStatus: { ...state.syncStatus, isSyncing: false, lastSynced },
        })),
      setSyncError: (error) =>
        set((state) => ({
          syncStatus: { ...state.syncStatus, isSyncing: false, lastError: error },
        })),
      clearSyncError: () =>
        set((state) => ({
          syncStatus: { ...state.syncStatus, lastError: null },
        })),

      // Filters
      filter: defaultFilter,
      setFilter: (filterUpdate) =>
        set((state) => ({
          filter: { ...state.filter, ...filterUpdate },
        })),
      resetFilter: () => set({ filter: defaultFilter }),

      // Expanded section
      expandedSection: defaultExpandedSection,
      setExpandedSection: (type, id, options) =>
        set({
          expandedSection: {
            type,
            id,
            color: options?.color,
            result: options?.result,
          },
        }),
      clearExpandedSection: () => set({ expandedSection: defaultExpandedSection }),
    }),
    {
      name: 'chess-dashboard-storage',
      partialize: (state) => ({
        // Only persist user and filter
        user: state.user,
        filter: state.filter,
      }),
    },
  ),
);

// ============================================
// SELECTORS
// ============================================

export const selectUser = (state: AppState) => state.user;
export const selectSyncStatus = (state: AppState) => state.syncStatus;
export const selectFilter = (state: AppState) => state.filter;
export const selectExpandedSection = (state: AppState) => state.expandedSection;
export const selectIsExpanded = (state: AppState, type: 'opening' | 'opponent', id: string) =>
  state.expandedSection.type === type && state.expandedSection.id === id;
