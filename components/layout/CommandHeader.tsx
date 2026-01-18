'use client';

import { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  User,
  ChevronDown,
  LogOut,
  RotateCcw,
  Edit3,
  Filter,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

interface CommandHeaderProps {
  username: string;
  platforms: { chesscom?: string; lichess?: string };
  lastSynced: Date | null;
  isSyncing: boolean;
  onSync: () => void;
  onEditProfile: () => void;
  onFullResync: () => void;
  onResetProfile: () => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  filteredCount?: number;
  totalCount?: number;
  hasActiveFilters?: boolean;
}

function formatSyncTime(date: Date | null): string {
  if (!date) return 'Never synced';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function CommandHeader({
  username,
  platforms,
  lastSynced,
  isSyncing,
  onSync,
  onEditProfile,
  onFullResync,
  onResetProfile,
  showFilters,
  onToggleFilters,
  filteredCount,
  totalCount,
  hasActiveFilters,
}: CommandHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const platformCount = [platforms.chesscom, platforms.lichess].filter(Boolean).length;

  return (
    <header className="h-14 bg-card/50 border-b border-border flex items-center justify-between px-6">
      {/* Left side - Filter toggle and game count */}
      <div className="flex items-center gap-4">
        {/* Filter Toggle Button */}
        {onToggleFilters && (
          <button
            onClick={onToggleFilters}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              showFilters
                ? 'bg-primary text-primary-foreground'
                : hasActiveFilters
                  ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && !showFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
        )}

        {/* Game count display */}
        {totalCount !== undefined && filteredCount !== undefined && (
          <div className="text-sm text-muted-foreground">
            {filteredCount === totalCount ? (
              <span>{totalCount.toLocaleString()} games</span>
            ) : (
              <span>
                <span className="text-foreground">{filteredCount.toLocaleString()}</span>
                {' '}of {totalCount.toLocaleString()} games
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side - Status and user controls */}
      <div className="flex items-center gap-4">
        {/* Sync Status */}
        <div className="flex items-center gap-3">
          <div className="status-badge status-badge-success">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span>{formatSyncTime(lastSynced)}</span>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn(
              'p-2 rounded-lg hover:bg-secondary transition-colors',
              isSyncing && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Sync games"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
            aria-expanded={themeMenuOpen}
            aria-haspopup="true"
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Sun className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Theme Dropdown */}
          {themeMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-36 bg-card border border-border rounded-lg shadow-xl py-1 z-50 animate-fade-in-up">
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  theme === 'light' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
                )}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  theme === 'dark' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
                )}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  theme === 'system' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
                )}
              >
                <Monitor className="w-4 h-4" />
                System
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">{username}</div>
              <div className="text-[10px] text-muted-foreground">
                {platformCount} platform{platformCount !== 1 ? 's' : ''}
              </div>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              menuOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-xl py-1 z-50 animate-fade-in-up" role="menu">
              {/* Platform Info */}
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Connected Platforms</div>
                {platforms.chesscom && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    Chess.com: {platforms.chesscom}
                  </div>
                )}
                {platforms.lichess && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-2 h-2 rounded-full bg-foreground" />
                    Lichess: {platforms.lichess}
                  </div>
                )}
              </div>

              {/* Menu Actions */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEditProfile();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onFullResync();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <RotateCcw className="w-4 h-4" />
                  Full Resync
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onResetProfile();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Reset Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
