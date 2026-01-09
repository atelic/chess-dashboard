'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, MoreVertical, Clock, User, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useSync } from '@/hooks/useSync';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { KnightIcon } from '@/components/icons/ChessPieces';
import { validateChessComUser } from '@/lib/api/chesscom';
import { validateLichessUser } from '@/lib/api/lichess';

interface DashboardHeaderProps {
  onGamesUpdated?: () => void;
}

export default function DashboardHeader({ onGamesUpdated }: DashboardHeaderProps) {
  const router = useRouter();
  const { user, deleteUser, createOrUpdateUser } = useUser();
  const { sync, fullResync, isSyncing, lastSynced } = useSync();
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Edit form state
  const [editChesscom, setEditChesscom] = useState('');
  const [editLichess, setEditLichess] = useState('');
  const [chesscomError, setChesscomError] = useState('');
  const [lichessError, setLichessError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSync = async () => {
    const result = await sync(false);
    if (result) {
      if (result.newGamesCount > 0) {
        showToast(`Found ${result.newGamesCount} new games!`, 'success');
      } else {
        showToast('Already up to date', 'info');
      }
      onGamesUpdated?.();
    }
  };

  const handleFullResync = async () => {
    setShowMenu(false);
    const result = await fullResync();
    if (result) {
      showToast(`Full resync complete. ${result.totalGamesCount} games loaded.`, 'success');
      onGamesUpdated?.();
    }
  };

  const handleReset = async () => {
    setShowMenu(false);
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

  const handleOpenEditModal = () => {
    setShowMenu(false);
    setEditChesscom(user?.chesscomUsername || '');
    setEditLichess(user?.lichessUsername || '');
    setChesscomError('');
    setLichessError('');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setChesscomError('');
    setLichessError('');

    // Require at least one username
    if (!editChesscom.trim() && !editLichess.trim()) {
      showToast('Please enter at least one username', 'error');
      return;
    }

    setIsValidating(true);

    try {
      // Validate new/changed usernames
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

      // Check what changed
      const chesscomChanged = editChesscom.trim() !== (user?.chesscomUsername || '');
      const lichessChanged = editLichess.trim() !== (user?.lichessUsername || '');
      const addedNewPlatform =
        (!user?.chesscomUsername && editChesscom.trim()) ||
        (!user?.lichessUsername && editLichess.trim());

      // Update user
      const updatedUser = await createOrUpdateUser(editChesscom.trim(), editLichess.trim());

      if (!updatedUser) {
        showToast('Failed to save profile', 'error');
        setIsSaving(false);
        return;
      }

      setShowEditModal(false);

      // If a new platform was added, trigger a full sync to get all games
      if (addedNewPlatform) {
        showToast('Profile updated! Syncing new games...', 'info');
        const result = await sync(true);
        if (result && result.newGamesCount > 0) {
          showToast(`Synced ${result.newGamesCount} new games!`, 'success');
        }
        onGamesUpdated?.();
      } else if (chesscomChanged || lichessChanged) {
        showToast('Profile updated! Run a full resync to fetch games for changed usernames.', 'info');
      } else {
        showToast('Profile saved', 'success');
      }
    } catch (error) {
      showToast('Failed to save profile', 'error');
      console.error('Save profile error:', error);
    } finally {
      setIsValidating(false);
      setIsSaving(false);
    }
  };

  const formatLastSynced = () => {
    if (!lastSynced && !user?.lastSyncedAt) return 'Never';

    const syncDate = lastSynced || (user?.lastSyncedAt ? new Date(user.lastSyncedAt) : null);
    if (!syncDate) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const displayUsername = user?.chesscomUsername || user?.lichessUsername || 'Player';
  const isProcessing = isValidating || isSaving || isSyncing;

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <KnightIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Chess Dashboard</h1>
                <p className="text-sm text-muted-foreground">{displayUsername}&apos;s games</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Last synced indicator */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Synced: {formatLastSynced()}</span>
              </div>

              {/* Sync Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || isResetting}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>

              {/* Options Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  disabled={isSyncing || isResetting}
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20">
                      <button
                        onClick={handleOpenEditModal}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent rounded-t-lg flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Edit Profile
                      </button>
                      <hr className="border-border" />
                      <button
                        onClick={handleFullResync}
                        disabled={isSyncing}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Full Resync
                      </button>
                      <hr className="border-border" />
                      <button
                        onClick={handleReset}
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent rounded-b-lg flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Reset Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => !isProcessing && setShowEditModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-foreground mb-2">Edit Profile</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Update your chess platform usernames. Adding a new platform will automatically sync games.
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
    </>
  );
}
