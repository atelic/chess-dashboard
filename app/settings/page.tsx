'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { validateChessComUser } from '@/lib/api/chesscom';
import { validateLichessUser } from '@/lib/api/lichess';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const { showToast } = useToast();

  // Chess accounts state
  const [chesscomUsername, setChesscomUsername] = useState(session?.user?.chesscomUsername || '');
  const [lichessUsername, setLichessUsername] = useState(session?.user?.lichessUsername || '');
  const [chesscomError, setChesscomError] = useState('');
  const [lichessError, setLichessError] = useState('');
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSaveAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setChesscomError('');
    setLichessError('');

    // Require at least one username
    if (!chesscomUsername.trim() && !lichessUsername.trim()) {
      showToast('At least one username is required', 'error');
      return;
    }

    setIsSavingAccounts(true);

    try {
      // Validate usernames
      const validations = await Promise.all([
        chesscomUsername.trim() ? validateChessComUser(chesscomUsername.trim()) : Promise.resolve(true),
        lichessUsername.trim() ? validateLichessUser(lichessUsername.trim()) : Promise.resolve(true),
      ]);

      const [chesscomValid, lichessValid] = validations;
      let hasError = false;

      if (chesscomUsername.trim() && !chesscomValid) {
        setChesscomError('User not found on Chess.com');
        hasError = true;
      }
      if (lichessUsername.trim() && !lichessValid) {
        setLichessError('User not found on Lichess');
        hasError = true;
      }

      if (hasError) {
        setIsSavingAccounts(false);
        return;
      }

      // Save to API
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chesscomUsername: chesscomUsername.trim() || null,
          lichessUsername: lichessUsername.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        showToast(data.error || 'Failed to save', 'error');
        setIsSavingAccounts(false);
        return;
      }

      // Update session
      await updateSession({
        chesscomUsername: chesscomUsername.trim() || null,
        lichessUsername: lichessUsername.trim() || null,
      });

      showToast('Chess accounts updated', 'success');
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsSavingAccounts(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || 'Failed to change password');
        setIsSavingPassword(false);
        return;
      }

      showToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('An error occurred');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        showToast(data.error || 'Failed to delete account', 'error');
        setIsDeleting(false);
        return;
      }

      // Sign out and redirect
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      showToast('An error occurred', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
            </div>
            <span className="text-zinc-400 text-sm">{session.user.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Chess Accounts */}
        <Card title="Chess Accounts" subtitle="Connect your Chess.com and Lichess accounts">
          <form onSubmit={handleSaveAccounts} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Chess.com Username"
                placeholder="e.g., hikaru"
                value={chesscomUsername}
                onChange={(e) => {
                  setChesscomUsername(e.target.value);
                  setChesscomError('');
                }}
                error={chesscomError}
                disabled={isSavingAccounts}
              />
              <Input
                label="Lichess Username"
                placeholder="e.g., DrNykterstein"
                value={lichessUsername}
                onChange={(e) => {
                  setLichessUsername(e.target.value);
                  setLichessError('');
                }}
                error={lichessError}
                disabled={isSavingAccounts}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSavingAccounts}
                disabled={isSavingAccounts}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Change Password */}
        <Card title="Change Password" subtitle="Update your account password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                <p className="text-red-400 text-sm">{passwordError}</p>
              </div>
            )}
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSavingPassword}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSavingPassword}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSavingPassword}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSavingPassword}
                disabled={isSavingPassword}
              >
                Change Password
              </Button>
            </div>
          </form>
        </Card>

        {/* Danger Zone */}
        <Card title="Danger Zone" subtitle="Irreversible actions">
          <div className="space-y-4">
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-zinc-100 font-medium">Delete Account</h4>
                  <p className="text-zinc-400 text-sm">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-800 text-red-400 hover:bg-red-900/20"
                >
                  Delete Account
                </Button>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 space-y-4">
                <p className="text-red-400">
                  This will permanently delete your account, all your games, and all associated data.
                  This action cannot be undone.
                </p>
                <Input
                  label="Type DELETE to confirm"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isDeleting}
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    isLoading={isDeleting}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete My Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
