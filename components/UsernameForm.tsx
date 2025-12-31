'use client';

import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useToast } from './ui/Toast';
import { validateChessComUser } from '@/lib/api/chesscom';
import { validateLichessUser } from '@/lib/api/lichess';

const STORAGE_KEY = 'chess-dashboard-usernames';

interface SavedUsernames {
  chesscom: string;
  lichess: string;
}

interface UsernameFormProps {
  onSubmit: (chesscomUsername: string, lichessUsername: string) => void;
  isLoading: boolean;
}

export default function UsernameForm({ onSubmit, isLoading }: UsernameFormProps) {
  const [chesscomUsername, setChesscomUsername] = useState('');
  const [lichessUsername, setLichessUsername] = useState('');
  const [chesscomError, setChesscomError] = useState('');
  const [lichessError, setLichessError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { showToast } = useToast();

  // Load saved usernames from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedUsernames = JSON.parse(saved);
        if (parsed.chesscom) setChesscomUsername(parsed.chesscom);
        if (parsed.lichess) setLichessUsername(parsed.lichess);
      }
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Failed to load saved usernames:', e);
    }
    setIsInitialized(true);
  }, []);

  // Save usernames to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      const toSave: SavedUsernames = {
        chesscom: chesscomUsername.trim(),
        lichess: lichessUsername.trim(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Failed to save usernames:', e);
    }
  }, [chesscomUsername, lichessUsername, isInitialized]);

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
      
      // Both valid, proceed
      onSubmit(chesscomUsername.trim(), lichessUsername.trim());
    } catch (error) {
      showToast('Failed to validate usernames. Please try again.', 'error');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">
          Enter your chess usernames
        </h2>
        
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
            disabled={isLoading || isValidating}
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
            disabled={isLoading || isValidating}
          />
        </div>
        
        <p className="text-sm text-zinc-500 mt-4 mb-6">
          Enter at least one username. Games from both platforms will be merged and analyzed together.
        </p>
        
        <Button
          type="submit"
          size="lg"
          isLoading={isValidating || isLoading}
          disabled={isLoading || isValidating}
          className="w-full md:w-auto"
        >
          {isValidating ? 'Validating...' : isLoading ? 'Loading Games...' : 'Analyze Games'}
        </Button>
      </div>
    </form>
  );
}
