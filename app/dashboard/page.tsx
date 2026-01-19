'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useGames, Game } from '@/hooks/useGames';
import { useSync } from '@/hooks/useSync';
import { useToast } from '@/components/ui/Toast';
import CommandDashboard from '@/components/CommandDashboard';
import Spinner from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Trash2 } from 'lucide-react';
import { validateChessComUser } from '@/lib/api/chesscom';
import { validateLichessUser } from '@/lib/api/lichess';
import type { Game as LibGame, FilterState } from '@/lib/types';
import { getDefaultFilters, filterGames, getSavedDefaultFilter, hasDefaultFilter } from '@/lib/utils';

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
  const { user, isLoading: userLoading, deleteUser, createOrUpdateUser } = useUser();
  const { games: apiGames, isLoading: gamesLoading, error, fetchGames } = useGames();
  const { sync, fullResync, isSyncing, lastSynced } = useSync();
  const { showToast } = useToast();

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Edit form state
  const [editChesscom, setEditChesscom] = useState('');
  const [editLichess, setEditLichess] = useState('');
  const [chesscomError, setChesscomError] = useState('');
  const [lichessError, setLichessError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());
  const [hasStoredDefault, setHasStoredDefault] = useState(false);

  useEffect(() => {
    setFilters(getSavedDefaultFilter());
    setHasStoredDefault(hasDefaultFilter());
  }, []);

  // Convert API games to lib games with Date objects
  const games = useMemo(() => convertGames(apiGames), [apiGames]);

  // Apply filters to games
  const filteredGames = useMemo(() => filterGames(games, filters), [games, filters]);

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

  // Handlers
  const handleSync = async () => {
    const result = await sync(false);
    if (result) {
      if (result.newGamesCount > 0) {
        showToast(`Found ${result.newGamesCount} new games!`, 'success');
      } else {
        showToast('Already up to date', 'info');
      }
      fetchGames();
    }
  };

  const handleFullResync = async () => {
    const result = await fullResync();
    if (result) {
      showToast(`Full resync complete. ${result.totalGamesCount} games loaded.`, 'success');
      fetchGames();
    }
  };

  const handleOpenEditModal = () => {
    setEditChesscom(user?.chesscomUsername || '');
    setEditLichess(user?.lichessUsername || '');
    setChesscomError('');
    setLichessError('');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setChesscomError('');
    setLichessError('');

    if (!editChesscom.trim() && !editLichess.trim()) {
      showToast('Please enter at least one username', 'error');
      return;
    }

    setIsValidating(true);

    try {
      const validations = await Promise.all([
        editChesscom.trim() && editChesscom.trim() !== user?.chesscomUsername
          ? validateChessComUser(editChesscom.trim())
          : Promise.resolve(true),
        editLichess.trim() && editLichess.trim() !== user?.lichessUsername
          ? validateLichessUser(editLichess.trim())
          : Promise.resolve(true),
      ]);

      const [chesscomValid, lichessValid] = validations;
      let hasError = false;

      if (editChesscom.trim() && !chesscomValid) {
        setChesscomError('User not found on Chess.com');
        hasError = true;
      }

      if (editLichess.trim() && !lichessValid) {
        setLichessError('User not found on Lichess');
        hasError = true;
      }

      if (hasError) {
        showToast('One or more usernames are invalid', 'error');
        setIsValidating(false);
        return;
      }

      setIsValidating(false);
      setIsSaving(true);

      const addedNewPlatform =
        (!user?.chesscomUsername && editChesscom.trim()) ||
        (!user?.lichessUsername && editLichess.trim());

      const updatedUser = await createOrUpdateUser(editChesscom.trim(), editLichess.trim());

      if (!updatedUser) {
        showToast('Failed to save profile', 'error');
        setIsSaving(false);
        return;
      }

      setShowEditModal(false);

      if (addedNewPlatform) {
        showToast('Profile updated! Syncing new games...', 'info');
        const result = await sync(true);
        if (result && result.newGamesCount > 0) {
          showToast(`Synced ${result.newGamesCount} new games!`, 'success');
        }
        fetchGames();
      } else {
        showToast('Profile saved', 'success');
      }
    } catch (err) {
      showToast('Failed to save profile', 'error');
      console.error('Save profile error:', err);
    } finally {
      setIsValidating(false);
      setIsSaving(false);
    }
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = async () => {
    setShowResetConfirm(false);
    setIsResetting(true);

    const success = await deleteUser();
    if (success) {
      showToast('Profile reset. Redirecting to setup...', 'info');
      router.replace('/');
    } else {
      showToast('Failed to reset profile', 'error');
    }

    setIsResetting(false);
  };

  const isProcessing = isValidating || isSaving || isSyncing;

  // Show loading while checking for user
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // User doesn't exist - will redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  // Get the last synced date
  const syncDate = lastSynced || (user.lastSyncedAt ? new Date(user.lastSyncedAt) : null);
  const displayUsername = user.chesscomUsername || user.lichessUsername || 'Player';

  return (
    <>
      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-900/90 border border-red-800 rounded-xl shadow-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading overlay */}
      {gamesLoading && games.length === 0 && (
        <div className="fixed inset-0 bg-background/80 z-40 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-muted-foreground">Loading games...</p>
          </div>
        </div>
      )}

      {/* Command Dashboard */}
      <CommandDashboard
        games={filteredGames}
        totalGames={games.length}
        username={displayUsername}
        platforms={{
          chesscom: user.chesscomUsername || undefined,
          lichess: user.lichessUsername || undefined,
        }}
        lastSynced={syncDate}
        isSyncing={isSyncing || isResetting}
        onSync={handleSync}
        onEditProfile={handleOpenEditModal}
        onFullResync={handleFullResync}
        onResetProfile={handleResetClick}
        filters={filters}
        onFiltersChange={setFilters}
        hasStoredDefault={hasStoredDefault}
        onDefaultSaved={() => setHasStoredDefault(true)}
        onDefaultCleared={() => {
          setHasStoredDefault(false);
          setFilters(getDefaultFilters());
        }}
      />

      {/* Edit Profile Modal */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => !isProcessing && setShowEditModal(false)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !isProcessing) {
                setShowEditModal(false);
              }
            }}
          >
            <div
              className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-foreground mb-2">Edit Profile</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Update your chess platform usernames.
              </p>

              <div className="space-y-4">
                <Input
                  label="Chess.com Username"
                  placeholder="e.g., hikaru"
                  value={editChesscom}
                  onChange={(e) => {
                    setEditChesscom(e.target.value);
                    setChesscomError('');
                  }}
                  error={chesscomError}
                  disabled={isProcessing}
                />

                <Input
                  label="Lichess Username"
                  placeholder="e.g., DrNykterstein"
                  value={editLichess}
                  onChange={(e) => {
                    setEditLichess(e.target.value);
                    setLichessError('');
                  }}
                  error={lichessError}
                  disabled={isProcessing}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isProcessing}
                  isLoading={isProcessing}
                  className="flex-1"
                >
                  {isValidating ? 'Validating...' : isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowResetConfirm(false)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowResetConfirm(false);
              }
            }}
          >
            <div
              className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Reset Profile?</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                This will permanently delete all your data including saved games and settings.
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleResetConfirm}
                  className="flex-1"
                >
                  Reset Profile
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
