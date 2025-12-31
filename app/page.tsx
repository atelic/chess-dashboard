'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useSync } from '@/hooks/useSync';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { validateChessComUser } from '@/lib/api/chesscom';
import { validateLichessUser } from '@/lib/api/lichess';

export default function SetupPage() {
  const router = useRouter();
  const { user, isLoading: userLoading, createOrUpdateUser } = useUser();
  const { sync, isSyncing } = useSync();
  const { showToast } = useToast();

  const [chesscomUsername, setChesscomUsername] = useState('');
  const [lichessUsername, setLichessUsername] = useState('');
  const [chesscomError, setChesscomError] = useState('');
  const [lichessError, setLichessError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Redirect to dashboard if user already exists
  useEffect(() => {
    if (!userLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setChesscomError('');
    setLichessError('');

    // Require at least one username
    if (!chesscomUsername.trim() && !lichessUsername.trim()) {
      showToast('Please enter at least one username', 'error');
      return;
    }

    setIsValidating(true);

    try {
      // Validate usernames in parallel
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
        showToast('One or more usernames are invalid', 'error');
        setIsValidating(false);
        return;
      }

      setIsValidating(false);
      setIsSettingUp(true);

      // Create user
      const newUser = await createOrUpdateUser(chesscomUsername.trim(), lichessUsername.trim());

      if (!newUser) {
        showToast('Failed to save profile', 'error');
        setIsSettingUp(false);
        return;
      }

      // Trigger initial sync
      showToast('Syncing games... This may take a moment.', 'info');
      const result = await sync(true); // Full sync for first time

      if (result) {
        showToast(`Synced ${result.newGamesCount} games!`, 'success');
      }

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      showToast('Failed to set up profile. Please try again.', 'error');
      console.error('Setup error:', error);
      setIsSettingUp(false);
    }
  };

  // Show loading while checking for existing user
  if (userLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // User exists - will redirect
  if (user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-4 text-zinc-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const isProcessing = isValidating || isSettingUp || isSyncing;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Chess Dashboard</h1>
              <p className="text-sm text-zinc-500">Analyze your games from Chess.com and Lichess</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                Welcome to Chess Dashboard
              </h2>
              <p className="text-zinc-400 mb-6">
                Enter your chess usernames to get started. Your games will be synced and stored locally.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Chess.com Username"
                  placeholder="e.g., hikaru"
                  value={chesscomUsername}
                  onChange={(e) => {
                    setChesscomUsername(e.target.value);
                    setChesscomError('');
                  }}
                  error={chesscomError}
                  disabled={isProcessing}
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
                  disabled={isProcessing}
                />
              </div>

              <p className="text-sm text-zinc-500 mt-4 mb-6">
                Enter at least one username. Games from both platforms will be merged and analyzed together.
              </p>

              <Button
                type="submit"
                size="lg"
                isLoading={isProcessing}
                disabled={isProcessing}
                className="w-full md:w-auto"
              >
                {isValidating
                  ? 'Validating...'
                  : isSettingUp
                  ? 'Setting up...'
                  : isSyncing
                  ? 'Syncing games...'
                  : 'Get Started'}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-zinc-600">
            Chess Dashboard - Analyze your games from Chess.com and Lichess
          </p>
        </div>
      </footer>
    </div>
  );
}
