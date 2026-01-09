'use client';

import * as React from 'react';
import { ChevronDown, BookOpen, Users, Calendar, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types';

// Existing analysis components
import OpeningInsights from '../OpeningInsights';
import OpeningDepthChart from '../OpeningDepthChart';
import OpponentAnalysis from '../OpponentAnalysis';
import DayPerformance from '../DayPerformance';
import InsightCards from '../InsightCards';
import TimeOfDayChart from '../TimeOfDayChart';
import TimeManagementChart from '../TimeManagementChart';
import TerminationChart from '../TerminationChart';
import StudyRecommendations from '../StudyRecommendations';
import GamePhaseChart from '../GamePhaseChart';
import ResilienceChart from '../ResilienceChart';

interface AnalysisTabProps {
  games: Game[];
}

interface AnalysisSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AnalysisSection({ id, title, icon, children, defaultOpen = false }: AnalysisSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left',
          'bg-card hover:bg-accent/50 transition-colors',
          isOpen && 'border-b border-border'
        )}
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        id={`section-${id}`}
        className={cn(
          'transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="p-4 space-y-6 bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AnalysisTab({ games }: AnalysisTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Study & Improvement - Most actionable, open by default */}
      <AnalysisSection
        id="improvement"
        title="Study & Improvement"
        icon={<TrendingUp className="h-4 w-4" />}
        defaultOpen
      >
        <StudyRecommendations games={games} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GamePhaseChart games={games} />
          <ResilienceChart games={games} />
        </div>
      </AnalysisSection>

      {/* Openings Analysis */}
      <AnalysisSection
        id="openings"
        title="Opening Repertoire"
        icon={<BookOpen className="h-4 w-4" />}
      >
        <OpeningInsights games={games} minGames={3} />
        <OpeningDepthChart games={games} />
      </AnalysisSection>

      {/* Opponents Analysis */}
      <AnalysisSection
        id="opponents"
        title="Opponent Breakdown"
        icon={<Users className="h-4 w-4" />}
      >
        <OpponentAnalysis games={games} minGames={2} />
      </AnalysisSection>

      {/* Time & Schedule Analysis */}
      <AnalysisSection
        id="schedule"
        title="Time & Schedule"
        icon={<Calendar className="h-4 w-4" />}
      >
        <DayPerformance games={games} />
        <TimeOfDayChart games={games} />
        <TimeManagementChart games={games} />
      </AnalysisSection>

      {/* Game Insights */}
      <AnalysisSection
        id="insights"
        title="Game Patterns"
        icon={<Lightbulb className="h-4 w-4" />}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auto-generated Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightCards games={games} />
          </CardContent>
        </Card>
        <TerminationChart games={games} />
      </AnalysisSection>
    </div>
  );
}
