'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { validateChessComUser } from '@/lib/api/chesscom';
import { validateLichessUser } from '@/lib/api/lichess';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const { showToast } = useToast();

  const [chesscomUsername, setChesscomUsername] = useState('');
  const [lichessUsername, setLichessUsername] = useState('');
  const [chesscomError, setChesscomError] = useState('');
  const [lichessError, setLichessError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Redirect if user already has chess accounts set up
  if (session?.user?.chesscomUsername || session?.user?.lichessUsername) {
    router.replace('/dashboard');
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setIsSaving(true);

      // Save usernames
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
        showToast(data.error || 'Failed to save usernames', 'error');
        setIsSaving(false);
        return;
      }

      // Update session with new usernames
      await updateSession({
        chesscomUsername: chesscomUsername.trim() || null,
        lichessUsername: lichessUsername.trim() || null,
      });

      setIsSaving(false);
      setIsSyncing(true);

      // Trigger initial sync
      showToast('Syncing games... This may take a moment.', 'info');
      const syncResponse = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync: true }),
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        showToast(`Synced ${syncData.newGamesCount} games!`, 'success');
      }

      // Navigate to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Onboarding error:', error);
      showToast('An error occurred. Please try again.', 'error');
      setIsValidating(false);
      setIsSaving(false);
      setIsSyncing(false);
    }
  };

  const isProcessing = isValidating || isSaving || isSyncing;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <h1 className="text-xl font-bold text-zinc-100">Chess Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2 text-center">
              Connect Your Chess Accounts
            </h2>
            <p className="text-zinc-400 text-center mb-6">
              Link your Chess.com and/or Lichess accounts to start analyzing your games.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
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

              <p className="text-sm text-zinc-500">
                Enter at least one username. Games from both platforms will be merged and analyzed together.
              </p>

              <Button
                type="submit"
                size="lg"
                isLoading={isProcessing}
                disabled={isProcessing}
                className="w-full"
              >
                {isValidating
                  ? 'Validating...'
                  : isSaving
                  ? 'Saving...'
                  : isSyncing
                  ? 'Syncing games...'
                  : 'Continue'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
