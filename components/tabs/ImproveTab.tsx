'use client';

import type { Game } from '@/lib/types';
import StudyRecommendations from '../StudyRecommendations';
import GamePhaseChart from '../GamePhaseChart';
import ResilienceChart from '../ResilienceChart';

interface ImproveTabProps {
  games: Game[];
}

export default function ImproveTab({ games }: ImproveTabProps) {
  return (
    <div className="space-y-6">
      {/* Study Recommendations - Main Feature */}
      <StudyRecommendations games={games} />

      {/* Analysis Charts */}
      <div className="grid grid-cols-1 gap-6">
        <GamePhaseChart games={games} />
        <ResilienceChart games={games} />
      </div>
    </div>
  );
}
