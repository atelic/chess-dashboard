'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // If authenticated, redirect to dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      // Check if user needs onboarding (no chess usernames set)
      if (!session?.user?.chesscomUsername && !session?.user?.lichessUsername) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [status, session, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Authenticated users will be redirected
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-3 text-zinc-400">Redirecting...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="secondary" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-100 mb-6">
            Analyze Your Chess Games
            <br />
            <span className="text-blue-500">From Any Platform</span>
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Connect your Chess.com and Lichess accounts to get deep insights into your 
            openings, time management, and performance trends.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Start Analyzing Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Opening Analysis</h3>
              <p className="text-zinc-400">
                Discover your best and worst openings. See win rates by ECO code 
                and understand where you need to improve.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Time Management</h3>
              <p className="text-zinc-400">
                Analyze how you use your clock. Find out when you&apos;re getting into time 
                trouble and improve your time management.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Opponent Insights</h3>
              <p className="text-zinc-400">
                See your record against specific opponents. Understand who you 
                struggle against and your performance by rating bracket.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-zinc-100 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-blue-500">
                1
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Create Account</h3>
              <p className="text-zinc-400">
                Sign up with your email in seconds. No credit card required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-blue-500">
                2
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Connect Platforms</h3>
              <p className="text-zinc-400">
                Link your Chess.com and/or Lichess usernames to import your games.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-blue-500">
                3
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Get Insights</h3>
              <p className="text-zinc-400">
                Explore detailed analytics and discover areas to improve your game.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-zinc-800 rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl font-bold text-zinc-100 mb-4">
              Ready to Improve Your Chess?
            </h2>
            <p className="text-xl text-zinc-400 mb-8 max-w-xl mx-auto">
              Join thousands of players using Chess Dashboard to analyze their games and climb the rating ladder.
            </p>
            <Link href="/register">
              <Button size="lg">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-sm text-zinc-400">Chess Dashboard</span>
            </div>
            <p className="text-sm text-zinc-500">
              Analyze your games from Chess.com and Lichess
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
