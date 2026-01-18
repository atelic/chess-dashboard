'use client';

import { useState, useMemo } from 'react';
import type { Game, FilterState } from '@/lib/types';
import CommandLayout from './layout/CommandLayout';
import type { NavSection } from './layout/CommandSidebar';
import CommandFilters from './layout/CommandFilters';
import { isBaseDefaults } from '@/lib/utils';

// Views
import OverviewView from './views/OverviewView';
import OpeningsView from './views/OpeningsView';
import OpponentsView from './views/OpponentsView';
import TimeView from './views/TimeView';
import PerformanceView from './views/PerformanceView';

// Existing components for Games and Explorer tabs
import GamesTab from './tabs/GamesTab';
import ExplorerTab from './tabs/ExplorerTab';

interface CommandDashboardProps {
  games: Game[];
  totalGames: number;
  username: string;
  platforms: { chesscom?: string; lichess?: string };
  lastSynced: Date | null;
  isSyncing: boolean;
  onSync: () => void;
  onEditProfile: () => void;
  onFullResync: () => void;
  onResetProfile: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hasStoredDefault: boolean;
  onDefaultSaved: () => void;
  onDefaultCleared: () => void;
}

export default function CommandDashboard({
  games,
  totalGames,
  username,
  platforms,
  lastSynced,
  isSyncing,
  onSync,
  onEditProfile,
  onFullResync,
  onResetProfile,
  filters,
  onFiltersChange,
  hasStoredDefault,
  onDefaultSaved,
  onDefaultCleared,
}: CommandDashboardProps) {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [showFilters, setShowFilters] = useState(false);

  const isAllTime = useMemo(() => {
    const hasNoDateRange = !filters.dateRange.start && !filters.dateRange.end;
    const hasNoGameLimit = filters.maxGames === 0;
    return hasNoDateRange && hasNoGameLimit;
  }, [filters.dateRange.start, filters.dateRange.end, filters.maxGames]);

  const hasActiveFilters = useMemo(() => !isBaseDefaults(filters), [filters]);

  // Render the active view based on navigation
  const renderView = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewView games={games} isAllTime={isAllTime} />;
      case 'games':
        return <GamesTab games={games} />;
      case 'explorer':
        return <ExplorerTab games={games} />;
      case 'openings':
        return <OpeningsView games={games} />;
      case 'opponents':
        return <OpponentsView games={games} />;
      case 'time':
        return <TimeView games={games} />;
      case 'performance':
        return <PerformanceView games={games} />;
      case 'settings':
        return <SettingsView onEditProfile={onEditProfile} onFullResync={onFullResync} onResetProfile={onResetProfile} />;
      default:
        return <OverviewView games={games} isAllTime={isAllTime} />;
    }
  };

  return (
    <CommandLayout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      username={username}
      platforms={platforms}
      lastSynced={lastSynced}
      isSyncing={isSyncing}
      onSync={onSync}
      onEditProfile={onEditProfile}
      onFullResync={onFullResync}
      onResetProfile={onResetProfile}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      filteredCount={games.length}
      totalCount={totalGames}
      hasActiveFilters={hasActiveFilters}
    >
      {/* Filter Panel */}
      {showFilters && (
        <CommandFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClose={() => setShowFilters(false)}
          hasStoredDefault={hasStoredDefault}
          onDefaultSaved={onDefaultSaved}
          onDefaultCleared={onDefaultCleared}
        />
      )}
      {renderView()}
    </CommandLayout>
  );
}

// Simple Settings View
function SettingsView({
  onEditProfile,
  onFullResync,
  onResetProfile,
}: {
  onEditProfile: () => void;
  onFullResync: () => void;
  onResetProfile: () => void;
}) {
  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetClick = () => setShowResetModal(true);
  const handleConfirmReset = () => {
    setShowResetModal(false);
    onResetProfile();
  };
  const handleCancelReset = () => setShowResetModal(false);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="command-panel">
        <div className="command-panel-header">
          <h3 className="text-sm font-semibold">Account</h3>
        </div>
        <div className="command-panel-content space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <div className="font-medium">Edit Profile</div>
              <div className="text-sm text-muted-foreground">Change your usernames</div>
            </div>
            <button
              onClick={onEditProfile}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Edit
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div>
              <div className="font-medium">Full Resync</div>
              <div className="text-sm text-muted-foreground">Re-fetch all games from platforms</div>
            </div>
            <button
              onClick={onFullResync}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors"
            >
              Resync
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/10">
            <div>
              <div className="font-medium text-red-400">Reset Profile</div>
              <div className="text-sm text-muted-foreground">Delete all data and start fresh</div>
            </div>
            <button
              onClick={handleResetClick}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          aria-describedby="reset-modal-description"
        >
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-xl animate-scale-in">
            <h2 id="reset-modal-title" className="text-lg font-semibold text-foreground mb-2">
              Reset Profile?
            </h2>
            <p id="reset-modal-description" className="text-sm text-muted-foreground mb-6">
              This will delete all your game data and settings. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelReset}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Reset Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
