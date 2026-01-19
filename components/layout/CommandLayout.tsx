'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import CommandSidebar, { NavSection } from './CommandSidebar';
import CommandHeader from './CommandHeader';
import { cn } from '@/lib/utils';

// Keyboard shortcut mappings
const SHORTCUTS: Record<string, NavSection> = {
  'g o': 'overview',
  'g g': 'games',
  'g e': 'explorer',
  'g a': 'openings',    // g a for "analysis/openings"
  'g p': 'opponents',   // g p for "players/opponents"
  'g t': 'time',
  'g r': 'performance', // g r for "results/performance"
  'g s': 'settings',
};

interface CommandLayoutProps {
  children: ReactNode;
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
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

export default function CommandLayout({
  children,
  activeSection,
  onNavigate,
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
}: CommandLayoutProps) {
  // Initialize from localStorage synchronously to avoid flash
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [keySequence, setKeySequence] = useState<string[]>([]);

  // Save collapsed state to localStorage
  const handleToggleCollapse = useCallback(() => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('sidebar-collapsed', String(newValue));
  }, [sidebarCollapsed]);

  // Keyboard shortcut handling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Handle single-key shortcuts
      if (key === '[') {
        e.preventDefault();
        handleToggleCollapse();
        return;
      }

      if (key === 'f' && onToggleFilters) {
        e.preventDefault();
        onToggleFilters();
        return;
      }

      // Handle key sequences (like "g o" for overview)
      if (key === 'g' || keySequence.length > 0) {
        e.preventDefault();

        const newSequence = [...keySequence, key];
        setKeySequence(newSequence);

        // Check if we have a matching shortcut
        const combo = newSequence.join(' ');
        const section = SHORTCUTS[combo];

        if (section) {
          onNavigate(section);
          setKeySequence([]);
        } else if (newSequence.length >= 2) {
          // Reset if no match after 2 keys
          setKeySequence([]);
        }

        // Clear sequence after a delay
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setKeySequence([]);
        }, 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [keySequence, onNavigate, handleToggleCollapse, onToggleFilters]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <CommandSidebar
        activeSection={activeSection}
        onNavigate={onNavigate}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          'content-transition min-h-screen',
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        {/* Header */}
        <CommandHeader
          username={username}
          platforms={platforms}
          lastSynced={lastSynced}
          isSyncing={isSyncing}
          onSync={onSync}
          onEditProfile={onEditProfile}
          onFullResync={onFullResync}
          onResetProfile={onResetProfile}
          showFilters={showFilters}
          onToggleFilters={onToggleFilters}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
