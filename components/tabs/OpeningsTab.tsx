'use client';

import type { Game } from '@/lib/types';
import OpeningInsights from '../OpeningInsights';
import OpeningDepthChart from '../OpeningDepthChart';

interface OpeningsTabProps {
  games: Game[];
}

export default function OpeningsTab({ games }: OpeningsTabProps) {
  return (
    <div className="space-y-6">
      <OpeningInsights games={games} minGames={3} />
      <OpeningDepthChart games={games} />
    </div>
  );
}
