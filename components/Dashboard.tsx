'use client';

import { useState } from 'react';
import { LayoutDashboard, List, BarChart3, Search } from 'lucide-react';
import type { Game } from '@/lib/types';
import Tabs, { Tab } from './ui/Tabs';
import OverviewTab from './tabs/OverviewTab';
import GamesTab from './tabs/GamesTab';
import ExplorerTab from './tabs/ExplorerTab';
import AnalysisTab from './tabs/AnalysisTab';
import { AnimatedKnight } from './icons/ChessPieces';

interface DashboardProps {
  games: Game[];
  isLoading: boolean;
  isAllTime?: boolean;
  onGamesUpdated?: () => void;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'games', label: 'Games', icon: <List className="w-4 h-4" /> },
  { id: 'explorer', label: 'Explorer', icon: <Search className="w-4 h-4" /> },
  { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="w-4 h-4" /> },
];

export default function Dashboard({ games, isLoading, isAllTime = false, onGamesUpdated }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AnimatedKnight className="mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading games...</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <BarChart3 className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No games to display</h3>
        <p className="text-muted-foreground max-w-md">
          Enter your Chess.com or Lichess username above to analyze your games.
        </p>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OverviewTab games={games} isAllTime={isAllTime} />;
      case 'games':
        return <GamesTab games={games} onGamesUpdated={onGamesUpdated} />;
      case 'explorer':
        return <ExplorerTab games={games} />;
      case 'analysis':
        return <AnalysisTab games={games} />;
      default:
        return <OverviewTab games={games} isAllTime={isAllTime} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {renderActiveTab()}
      </div>
    </div>
  );
}
